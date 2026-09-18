import dotenv from 'dotenv';
import { connectDatabase } from './src/config/database';
import { User } from './src/models/User.model';
import { Staff } from './src/models/Staff.model';
import { hashPassword } from './src/utils/bcrypt.util';

dotenv.config();

const seedDemoStaff = async () => {
  try {
    await connectDatabase();

    const phone = '6390000000';
    const email = 'staff@hysafe.com';
    const name = 'Demo Staff';
    const password = 'HysafeStaff@123';

    const hashedPassword = await hashPassword(password);

    let staffUser = await User.findOne({ email });

    if (staffUser) {
      staffUser.phone = phone;
      staffUser.password = hashedPassword;
      staffUser.name = name;
      staffUser.role = 'staff';
      staffUser.isActive = true;
      await staffUser.save();
    } else {
      staffUser = await User.create({
        email,
        phone,
        password: hashedPassword,
        role: 'staff',
        name,
        isActive: true,
      });
    }

    const existingStaff = await Staff.findOne({ userId: staffUser._id });

    if (existingStaff) {
      existingStaff.name = name;
      existingStaff.phone = phone;
      existingStaff.isOnline = true;
      await existingStaff.save();
    } else {
      await Staff.create({
        userId: staffUser._id,
        name,
        phone,
        isOnline: true,
        cansInHand: 0,
      });
    }

    console.log('✅ Demo staff user created successfully');
    console.log('Phone:', phone);
    console.log('Password:', password);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo staff user:', error);
    process.exit(1);
  }
};

seedDemoStaff();