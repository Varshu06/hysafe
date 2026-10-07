import dotenv from 'dotenv';
import { connectDatabase } from './src/config/database';
import { User } from './src/models/User.model';
import { hashPassword } from './src/utils/bcrypt.util';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connectDatabase();

    const phone = '8012555333';
    const email = 'hygieneandsafe@gmail.com';
    const name = 'Admin User';
    const password = 'Hysafe@Vanessa645';

    const hashedPassword = await hashPassword(password);

    // Find existing admin by email
    let admin = await User.findOne({ email });

    if (admin) {
      // Update existing admin
      admin.phone = phone;
      admin.password = hashedPassword;
      admin.name = name;

      await admin.save();

      console.log('✅ Admin user updated successfully');
    } else {
      // Create new admin
      admin = await User.create({
        email,
        phone,
        password: hashedPassword,
        role: 'admin',
        name,
        isActive: true,
      });

      console.log('✅ Admin user created successfully');
    }

    console.log('Phone:', admin.phone);
    console.log('Password:', password);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating/updating admin user:', error);
    process.exit(1);
  }
};

seedAdmin();