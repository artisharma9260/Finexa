process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../server.js';
import User from '../models/User.js';
import Account from '../models/Account.js';
import Limit from '../models/Limit.js';
import Transaction from '../models/Transaction.js';
import { generateToken } from '../utils/generateToken.js';

let server;
let baseUrl;
let parent, student, recipient;
let parentToken, studentToken;
let studentAccount, recipientAccount;

describe('Student Spending Limits Check', () => {
  before(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finexa');
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();
    parent = await User.create({
      name: 'Limits Test Parent',
      email: `parent_limits_${timestamp}@test.com`,
      password: 'password123',
      role: 'parent',
    });
    parentToken = generateToken(parent._id, parent.role);

    student = await User.create({
      name: 'Limits Test Student',
      email: `student_limits_${timestamp}@test.com`,
      password: 'password123',
      role: 'student',
      parentId: parent._id,
    });
    studentToken = generateToken(student._id, student.role);

    recipient = await User.create({
      name: 'Limits Test Recipient',
      email: `recipient_limits_${timestamp}@test.com`,
      password: 'password123',
      role: 'student',
    });

    studentAccount = await Account.create({ userId: student._id, balance: 500 });
    recipientAccount = await Account.create({ userId: recipient._id, balance: 100 });
  });

  after(async () => {
    // Cleanup database artifacts created during test
    if (parent && student && recipient) {
      await User.deleteMany({ _id: { $in: [parent._id, student._id, recipient._id] } });
      await Account.deleteMany({ userId: { $in: [parent._id, student._id, recipient._id] } });
      await Limit.deleteMany({ studentId: student._id });
      await Transaction.deleteMany({
        $or: [{ from: studentAccount._id }, { to: recipientAccount._id }],
      });
    }

    if (server) server.close();
    await mongoose.disconnect();
  });

  it('1. Parent successfully sets student spending limits', async () => {
    const res = await fetch(`${baseUrl}/api/parent/limits/${student._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${parentToken}`,
      },
      body: JSON.stringify({
        dailyLimit: 100,
        monthlyLimit: 300,
        approvalAbove: 80,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.limit.dailyLimit, 100);
    assert.equal(data.limit.monthlyLimit, 300);
    assert.equal(data.limit.approvalAbove, 80);
  });

  it('2. Student transfer within limits succeeds immediately', async () => {
    const res = await fetch(`${baseUrl}/api/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        toAccountId: recipientAccount._id,
        amount: 40,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.transaction.status, 'completed');

    const updatedStudentAcc = await Account.findById(studentAccount._id);
    const updatedRecipientAcc = await Account.findById(recipientAccount._id);
    assert.equal(updatedStudentAcc.balance, 460);
    assert.equal(updatedRecipientAcc.balance, 140);
  });

  it('3. Student transfer exceeding daily limit is blocked with 403', async () => {
    // Current daily spent is $40, daily limit is $100.
    // Attempting $70 brings daily total to $110 (> $100) -> Must be Blocked.
    const res = await fetch(`${baseUrl}/api/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        toAccountId: recipientAccount._id,
        amount: 70,
      }),
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.message, /Daily limit of \$100\.00 exceeded/);
    assert.equal(data.status, 'Blocked');

    // Verify balance was NOT deducted
    const studentAcc = await Account.findById(studentAccount._id);
    assert.equal(studentAcc.balance, 460);

    // Verify transaction is recorded in DB as Blocked
    const blockedTx = await Transaction.findById(data.transaction._id);
    assert.ok(blockedTx);
    assert.equal(blockedTx.status, 'Blocked');
  });

  it('4. Parent raises daily limit, and the same transfer now succeeds', async () => {
    // Raise daily limit to $200
    const updateRes = await fetch(`${baseUrl}/api/parent/limits/${student._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${parentToken}`,
      },
      body: JSON.stringify({
        dailyLimit: 200,
        monthlyLimit: 300,
        approvalAbove: 80,
      }),
    });
    assert.equal(updateRes.status, 200);

    // Transfer $30 (total daily spent becomes $40 + $30 = $70, within $200)
    const transferRes = await fetch(`${baseUrl}/api/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        toAccountId: recipientAccount._id,
        amount: 30,
      }),
    });

    assert.equal(transferRes.status, 200);
    const studentAcc = await Account.findById(studentAccount._id);
    assert.equal(studentAcc.balance, 430);
  });

  it('5. Transfer exceeding monthly limit is blocked with 403', async () => {
    // Current monthly spent is $40 + $30 = $70. Monthly limit is $300.
    // Set daily limit to 400 so daily limit doesn't trigger first.
    await Limit.updateOne({ studentId: student._id }, { dailyLimit: 400, monthlyLimit: 100, approvalAbove: 150 });

    // Attempting $50 brings monthly spent to $70 + $50 = $120 (> 100) -> Blocked
    const res = await fetch(`${baseUrl}/api/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        toAccountId: recipientAccount._id,
        amount: 50,
      }),
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.message, /Monthly limit of \$100\.00 exceeded/);
    assert.equal(data.status, 'Blocked');

    // Balance remains unchanged
    const studentAcc = await Account.findById(studentAccount._id);
    assert.equal(studentAcc.balance, 430);
  });
});
