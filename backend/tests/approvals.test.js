process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../server.js';
import User from '../models/User.js';
import Account from '../models/Account.js';
import Limit from '../models/Limit.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { generateToken } from '../utils/generateToken.js';

let server;
let baseUrl;
let parent, student, recipient;
let parentToken, studentToken;
let studentAccount, recipientAccount;
let pendingTxId1, pendingTxId2;

describe('Transfer Approval Workflow Flow', () => {
  before(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/finexa');
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const timestamp = Date.now();
    parent = await User.create({
      name: 'Approval Test Parent',
      email: `parent_appr_${timestamp}@test.com`,
      password: 'password123',
      role: 'parent',
    });
    parentToken = generateToken(parent._id, parent.role);

    student = await User.create({
      name: 'Approval Test Student',
      email: `student_appr_${timestamp}@test.com`,
      password: 'password123',
      role: 'student',
      parentId: parent._id,
    });
    studentToken = generateToken(student._id, student.role);

    recipient = await User.create({
      name: 'Approval Test Recipient',
      email: `recipient_appr_${timestamp}@test.com`,
      password: 'password123',
      role: 'student',
    });

    studentAccount = await Account.create({ userId: student._id, balance: 500 });
    recipientAccount = await Account.create({ userId: recipient._id, balance: 100 });

    // Set approval threshold at $50
    await Limit.create({
      studentId: student._id,
      parentId: parent._id,
      dailyLimit: 300,
      monthlyLimit: 1000,
      approvalAbove: 50,
    });
  });

  after(async () => {
    if (parent && student && recipient) {
      await User.deleteMany({ _id: { $in: [parent._id, student._id, recipient._id] } });
      await Account.deleteMany({ userId: { $in: [parent._id, student._id, recipient._id] } });
      await Limit.deleteMany({ studentId: student._id });
      await Transaction.deleteMany({
        $or: [{ from: studentAccount._id }, { to: recipientAccount._id }],
      });
      await Notification.deleteMany({
        userId: { $in: [parent._id, student._id] },
      });
    }

    if (server) server.close();
    await mongoose.disconnect();
  });

  it('1. Transfer exceeding approvalAbove ($65 > $50) returns 202 Accepted and status pending', async () => {
    const res = await fetch(`${baseUrl}/api/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        toAccountId: recipientAccount._id,
        amount: 65,
      }),
    });

    assert.equal(res.status, 202);
    const data = await res.json();
    assert.equal(data.status, 'pending');
    assert.match(data.message, /requires parent approval/);

    pendingTxId1 = data.transaction._id;

    // Verify balances remain untouched
    const sAcc = await Account.findById(studentAccount._id);
    const rAcc = await Account.findById(recipientAccount._id);
    assert.equal(sAcc.balance, 500);
    assert.equal(rAcc.balance, 100);
  });

  it('2. Parent is notified of transfer needing approval', async () => {
    const res = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${parentToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const reqNotif = data.notifications.find(
      (n) => n.type === 'transfer_request' && n.transactionId === pendingTxId1
    );

    assert.ok(reqNotif, 'Parent should have a transfer_request notification');
    assert.equal(reqNotif.read, false);
    assert.match(reqNotif.message, /Approval Test Student requested a transfer of \$65\.00/);
  });

  it('3. Parent lists pending approvals and finds the request', async () => {
    const res = await fetch(`${baseUrl}/api/parent/approvals`, {
      headers: { Authorization: `Bearer ${parentToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.approvals));
    const found = data.approvals.find((tx) => tx._id === pendingTxId1);
    assert.ok(found);
    assert.equal(found.amount, 65);
    assert.equal(found.status, 'pending');
  });

  it('4. Parent approves the transfer: balances move and status is completed with approvedBy', async () => {
    const res = await fetch(`${baseUrl}/api/parent/approvals/${pendingTxId1}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.transaction.status, 'completed');
    assert.equal(data.transaction.approvedBy._id.toString(), parent._id.toString());

    // Verify balances moved atomically: 500 - 65 = 435, 100 + 65 = 165
    const sAcc = await Account.findById(studentAccount._id);
    const rAcc = await Account.findById(recipientAccount._id);
    assert.equal(sAcc.balance, 435);
    assert.equal(rAcc.balance, 165);

    // Verify student received approval notification
    const sNotifRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const sNotifData = await sNotifRes.json();
    const apprNotif = sNotifData.notifications.find(
      (n) => n.type === 'transfer_approved' && n.transactionId === pendingTxId1
    );
    assert.ok(apprNotif, 'Student should receive transfer_approved notification');
    assert.match(apprNotif.message, /approved by your parent/);
  });

  it('5. Cannot re-approve an already completed transaction', async () => {
    const res = await fetch(`${baseUrl}/api/parent/approvals/${pendingTxId1}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /already completed and cannot be approved/);
  });

  it('6. Parent rejects a pending transfer: no money moves and status is Rejected', async () => {
    // Initiate second transfer for $80 (> 50)
    const t2Res = await fetch(`${baseUrl}/api/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        toAccountId: recipientAccount._id,
        amount: 80,
      }),
    });
    const t2Data = await t2Res.json();
    pendingTxId2 = t2Data.transaction._id;

    // Parent rejects it
    const rejectRes = await fetch(`${baseUrl}/api/parent/approvals/${pendingTxId2}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${parentToken}` },
    });

    assert.equal(rejectRes.status, 200);
    const rejectData = await rejectRes.json();
    assert.equal(rejectData.transaction.status, 'Rejected');
    assert.equal(rejectData.transaction.rejectedBy._id.toString(), parent._id.toString());

    // Verify balances did NOT change (student stays 435, recipient stays 165)
    const sAcc = await Account.findById(studentAccount._id);
    const rAcc = await Account.findById(recipientAccount._id);
    assert.equal(sAcc.balance, 435);
    assert.equal(rAcc.balance, 165);

    // Verify student received rejection notification
    const sNotifRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const sNotifData = await sNotifRes.json();
    const rejNotif = sNotifData.notifications.find(
      (n) => n.type === 'transfer_rejected' && n.transactionId === pendingTxId2
    );
    assert.ok(rejNotif, 'Student should receive transfer_rejected notification');
    assert.match(rejNotif.message, /rejected by your parent/);
  });
});
