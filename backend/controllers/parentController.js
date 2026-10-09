import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import Account from '../models/Account.js';
import Limit from '../models/Limit.js';

// @desc    Invite a student by email and link accounts
// @route   POST /api/parent/invite
// @access  Private (Parent only)
export const inviteStudent = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Please provide the student email address',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Prevent parent from inviting themselves
    if (normalizedEmail === req.user.email.toLowerCase()) {
      return res.status(400).json({
        message: 'You cannot invite yourself as a student',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      // If user exists but is a parent, cannot link
      if (existingUser.role !== 'student') {
        return res.status(400).json({
          message: 'Cannot link: An account with this email is registered as a parent',
        });
      }

      // If already linked to this parent
      if (
        existingUser.parentId &&
        existingUser.parentId.toString() === req.user._id.toString()
      ) {
        return res.status(400).json({
          message: 'This student is already linked to your account',
        });
      }

      // If linked to another parent
      if (
        existingUser.parentId &&
        existingUser.parentId.toString() !== req.user._id.toString()
      ) {
        return res.status(400).json({
          message: 'This student is already linked to another parent account',
        });
      }

      // Link student to this parent
      existingUser.parentId = req.user._id;
      await existingUser.save();

      // Clean up or mark any pending invites as accepted
      await Invitation.updateMany(
        { studentEmail: normalizedEmail },
        { status: 'accepted' }
      );

      return res.status(200).json({
        message: `Student ${existingUser.name} (${existingUser.email}) linked successfully!`,
        status: 'linked',
        student: {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          parentId: existingUser.parentId,
          createdAt: existingUser.createdAt,
        },
      });
    }

    // Student has not registered yet: create or update pending invite
    const existingInvite = await Invitation.findOne({
      parentId: req.user._id,
      studentEmail: normalizedEmail,
      status: 'pending',
    });

    if (existingInvite) {
      return res.status(200).json({
        message: `An invitation was already sent to ${normalizedEmail}. The account will link once they register.`,
        status: 'pending',
        invite: existingInvite,
      });
    }

    const invite = await Invitation.create({
      parentId: req.user._id,
      studentEmail: normalizedEmail,
      status: 'pending',
    });

    return res.status(201).json({
      message: `Invitation recorded for ${normalizedEmail}. When the student registers, they will be automatically linked to your account!`,
      status: 'pending',
      invite,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error processing invitation',
      error: error.message,
    });
  }
};

// @desc    Get all students linked to the logged-in parent
// @route   GET /api/parent/students
// @access  Private (Parent only)
export const getLinkedStudents = async (req, res) => {
  try {
    // Only return students linked to this parent
    const rawStudents = await User.find({
      parentId: req.user._id,
      role: 'student',
    })
      .select('-password')
      .sort({ createdAt: -1 });

    // Attach account details and limits to each student
    const students = await Promise.all(
      rawStudents.map(async (st) => {
        let account = await Account.findOne({ userId: st._id });
        if (!account) {
          account = await Account.create({ userId: st._id, balance: 500 });
        }

        let limit = await Limit.findOne({ studentId: st._id });
        if (!limit) {
          limit = await Limit.create({
            studentId: st._id,
            parentId: req.user._id,
            dailyLimit: 100,
            monthlyLimit: 500,
            approvalAbove: 50,
          });
        }

        return {
          ...st.toObject(),
          account: {
            id: account._id,
            balance: account.balance,
          },
          limit: {
            id: limit._id,
            dailyLimit: limit.dailyLimit,
            monthlyLimit: limit.monthlyLimit,
            approvalAbove: limit.approvalAbove,
          },
        };
      })
    );

    // Also fetch pending invitations for this parent
    const pendingInvites = await Invitation.find({
      parentId: req.user._id,
      status: 'pending',
    }).sort({ createdAt: -1 });

    res.status(200).json({
      students,
      pendingInvites,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error retrieving linked students',
      error: error.message,
    });
  }
};

// @desc    Set or update spending limits for a linked student
// @route   POST /api/parent/limits/:studentId
// @access  Private (Parent only)
export const setStudentLimits = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { dailyLimit, monthlyLimit, approvalAbove } = req.body;

    // Verify student is linked to this parent
    const student = await User.findOne({
      _id: studentId,
      parentId: req.user._id,
      role: 'student',
    });

    if (!student) {
      return res.status(404).json({
        message: 'Linked student not found under your account',
      });
    }

    // Validation
    const dLimit = Number(dailyLimit);
    const mLimit = Number(monthlyLimit);
    const appAbove = Number(approvalAbove);

    if (isNaN(dLimit) || dLimit < 0) {
      return res.status(400).json({
        message: 'Daily limit must be a valid number >= 0',
      });
    }

    if (isNaN(mLimit) || mLimit < 0) {
      return res.status(400).json({
        message: 'Monthly limit must be a valid number >= 0',
      });
    }

    if (isNaN(appAbove) || appAbove < 0) {
      return res.status(400).json({
        message: 'Approval threshold must be a valid number >= 0',
      });
    }

    // Upsert limit for student
    const limit = await Limit.findOneAndUpdate(
      { studentId: student._id },
      {
        studentId: student._id,
        parentId: req.user._id,
        dailyLimit: dLimit,
        monthlyLimit: mLimit,
        approvalAbove: appAbove,
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.status(200).json({
      message: `Spending limits successfully updated for ${student.name}`,
      limit,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error setting student limits',
      error: error.message,
    });
  }
};

// @desc    Get spending limits for a linked student
// @route   GET /api/parent/limits/:studentId
// @access  Private (Parent only)
export const getStudentLimits = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findOne({
      _id: studentId,
      parentId: req.user._id,
      role: 'student',
    });

    if (!student) {
      return res.status(404).json({
        message: 'Linked student not found under your account',
      });
    }

    let limit = await Limit.findOne({ studentId: student._id });
    if (!limit) {
      limit = await Limit.create({
        studentId: student._id,
        parentId: req.user._id,
        dailyLimit: 100,
        monthlyLimit: 500,
        approvalAbove: 50,
      });
    }

    res.status(200).json({
      limit,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error retrieving student limits',
      error: error.message,
    });
  }
};

// @desc    Unlink a student from this parent
// @route   POST /api/parent/unlink/:studentId
// @access  Private (Parent only)
export const unlinkStudent = async (req, res) => {
  try {
    const student = await User.findOne({
      _id: req.params.studentId,
      parentId: req.user._id,
    });

    if (!student) {
      return res.status(404).json({
        message: 'Linked student not found',
      });
    }

    student.parentId = null;
    await student.save();

    res.status(200).json({
      message: `Unlinked student ${student.name} from your account`,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error unlinking student',
      error: error.message,
    });
  }
};

// @desc    Cancel a pending invitation
// @route   DELETE /api/parent/invite/:inviteId
// @access  Private (Parent only)
export const cancelInvite = async (req, res) => {
  try {
    const invite = await Invitation.findOneAndDelete({
      _id: req.params.inviteId,
      parentId: req.user._id,
    });

    if (!invite) {
      return res.status(404).json({
        message: 'Pending invitation not found',
      });
    }

    res.status(200).json({
      message: `Invitation for ${invite.studentEmail} cancelled`,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error cancelling invitation',
      error: error.message,
    });
  }
};
