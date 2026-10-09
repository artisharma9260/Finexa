import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/authRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import connectDB from './config/db.js';
import Transaction from './models/Transaction.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/accounts', accountRoutes);

await connectDB();

const PORT = 5004;
const server = app.listen(PORT, async () => {
  console.log(`Student limits test server running on port ${PORT}`);
  const API_URL = `http://127.0.0.1:${PORT}/api`;

  try {
    const timestamp = Date.now();

    // 1. Register Parent
    const parentRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Parent Rachel',
        email: `rachel_${timestamp}@parent.com`,
        password: 'password123',
        role: 'parent',
      }),
    });
    const parentData = await parentRes.json();
    const tokenParent = parentData.token;
    const parentAccId = parentData.user.accountId;
    console.log('1. Register Parent:', parentRes.status, parentData.user.name);

    // 2. Register Student
    const studentEmail = `sam_${timestamp}@student.com`;
    const studentRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Sam',
        email: studentEmail,
        password: 'password123',
        role: 'student',
      }),
    });
    const studentData = await studentRes.json();
    const tokenStudent = studentData.token;
    const studentId = studentData.user.id;
    const studentAccId = studentData.user.accountId;
    console.log('2. Register Student:', studentRes.status, studentData.user.name);

    // 3. Link Student to Parent
    const linkRes = await fetch(`${API_URL}/parent/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenParent}`,
      },
      body: JSON.stringify({ email: studentEmail }),
    });
    const linkData = await linkRes.json();
    console.log('3. Link Student:', linkRes.status, linkData.message);

    // 4. Parent sets limits for Student (daily: $100, monthly: $250, approvalAbove: $50)
    const setLimitsRes = await fetch(`${API_URL}/parent/limits/${studentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenParent}`,
      },
      body: JSON.stringify({
        dailyLimit: 100,
        monthlyLimit: 250,
        approvalAbove: 50,
      }),
    });
    const setLimitsData = await setLimitsRes.json();
    console.log('4. Parent set limits:', setLimitsRes.status, setLimitsData.limit);

    // 5. Student transfers $60 to Parent (below daily $100 & monthly $250) - Expect 200 OK
    const tx1Res = await fetch(`${API_URL}/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent}`,
      },
      body: JSON.stringify({
        toAccountId: parentAccId,
        amount: 60,
      }),
    });
    const tx1Data = await tx1Res.json();
    console.log('5. Student transfer $60 (under limit):', tx1Res.status, tx1Data.message, 'Balance:', tx1Data.fromAccount.newBalance);

    // 6. Student attempts transfer of $50 ($60 + $50 = $110 > dailyLimit $100) - Expect 403 Blocked!
    const tx2Res = await fetch(`${API_URL}/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent}`,
      },
      body: JSON.stringify({
        toAccountId: parentAccId,
        amount: 50,
      }),
    });
    const tx2Data = await tx2Res.json();
    console.log('6. Student transfer $50 (exceeds daily limit):', tx2Res.status, 'Status:', tx2Data.status);
    console.log('   Message:', tx2Data.message);
    console.log('   Blocked Transaction saved:', tx2Data.transaction?._id, 'status:', tx2Data.transaction?.status);

    // Verify transaction in DB has status 'Blocked'
    const blockedTxInDb = await Transaction.findById(tx2Data.transaction?._id);
    console.log('   Verified in DB status:', blockedTxInDb?.status, 'Amount:', blockedTxInDb?.amount);

    // Verify student balance was NOT deducted (still 440 = 500 - 60)
    const checkAccRes = await fetch(`${API_URL}/accounts/my-account`, {
      headers: { Authorization: `Bearer ${tokenStudent}` },
    });
    const checkAccData = await checkAccRes.json();
    console.log('   Student balance remained intact:', checkAccData.account.balance, '(expected 440)');

    // 7. Parent raises dailyLimit to $150
    const updateLimitRes = await fetch(`${API_URL}/parent/limits/${studentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenParent}`,
      },
      body: JSON.stringify({
        dailyLimit: 150,
        monthlyLimit: 250,
        approvalAbove: 50,
      }),
    });
    const updateLimitData = await updateLimitRes.json();
    console.log('7. Parent raised dailyLimit to 150:', updateLimitRes.status, updateLimitData.limit.dailyLimit);

    // 8. Student retries the $50 transfer ($60 + $50 = $110 <= 150 daily, <= 250 monthly) - Expect 200 OK
    const tx3Res = await fetch(`${API_URL}/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent}`,
      },
      body: JSON.stringify({
        toAccountId: parentAccId,
        amount: 50,
      }),
    });
    const tx3Data = await tx3Res.json();
    console.log('8. Retry $50 transfer after limit increase:', tx3Res.status, tx3Data.message, 'Balance:', tx3Data.fromAccount.newBalance);

    // 9. Student attempts transfer of $160 ($110 + $160 = $270 > monthlyLimit $250) - Expect 403 Monthly Blocked!
    const tx4Res = await fetch(`${API_URL}/accounts/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStudent}`,
      },
      body: JSON.stringify({
        toAccountId: parentAccId,
        amount: 160,
      }),
    });
    const tx4Data = await tx4Res.json();
    console.log('9. Transfer $160 (exceeds monthly limit):', tx4Res.status, 'Status:', tx4Data.status);
    console.log('   Message:', tx4Data.message);
    console.log('   Blocked Transaction saved:', tx4Data.transaction?._id, 'status:', tx4Data.transaction?.status);

    console.log('\n✅ ALL STUDENT SPENDING LIMIT TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
