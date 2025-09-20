import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting development database seeding...');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.complaint.deleteMany();
    await prisma.serviceRequest.deleteMany();
    await prisma.subZone.deleteMany();
    await prisma.user.deleteMany();
    await prisma.ward.deleteMany();
    await prisma.department.deleteMany();
    await prisma.systemConfig.deleteMany();

    // Create wards
    console.log('🏛️ Creating wards...');
    const wards = await Promise.all([
      prisma.ward.create({
        data: {
          name: 'Fort Kochi',
          description: 'Historic port area with tourist attractions',
          isActive: true,
        },
      }),
      prisma.ward.create({
        data: {
          name: 'Mattancherry',
          description: 'Commercial and spice trading hub',
          isActive: true,
        },
      }),
      prisma.ward.create({
        data: {
          name: 'Ernakulam South',
          description: 'Business district with offices and shops',
          isActive: true,
        },
      }),
      prisma.ward.create({
        data: {
          name: 'Marine Drive',
          description: 'Waterfront promenade area',
          isActive: true,
        },
      }),
    ]);

    // Create sub-zones
    console.log('📍 Creating sub-zones...');
    const subZones = await Promise.all([
      prisma.subZone.create({
        data: {
          name: 'Princess Street',
          wardId: wards[0].id,
          description: 'Main shopping area',
          isActive: true,
        },
      }),
      prisma.subZone.create({
        data: {
          name: 'Chinese Fishing Nets',
          wardId: wards[0].id,
          description: 'Tourist attraction area',
          isActive: true,
        },
      }),
      prisma.subZone.create({
        data: {
          name: 'Jew Town',
          wardId: wards[1].id,
          description: 'Heritage area with synagogue',
          isActive: true,
        },
      }),
      prisma.subZone.create({
        data: {
          name: 'MG Road',
          wardId: wards[2].id,
          description: 'Main business street',
          isActive: true,
        },
      }),
    ]);

    // Create departments
    console.log('🏢 Creating departments...');
    const departments = await Promise.all([
      prisma.department.create({
        data: {
          name: 'Public Works',
          description: 'Roads, drainage, and infrastructure',
          isActive: true,
        },
      }),
      prisma.department.create({
        data: {
          name: 'Waste Management',
          description: 'Garbage collection and disposal',
          isActive: true,
        },
      }),
      prisma.department.create({
        data: {
          name: 'Health & Sanitation',
          description: 'Public health and sanitation services',
          isActive: true,
        },
      }),
      prisma.department.create({
        data: {
          name: 'Electrical',
          description: 'Street lighting and electrical maintenance',
          isActive: true,
        },
      }),
    ]);

    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@cochismartcity.dev',
        fullName: 'System Administrator',
        phoneNumber: '+919876543210',
        password: hashedPassword,
        role: 'ADMINISTRATOR',
        department: departments[0].name,
        language: 'en',
        isActive: true,
      },
    });

    // Create ward officers
    console.log('👮 Creating ward officers...');
    const wardOfficers = await Promise.all([
      prisma.user.create({
        data: {
          email: 'ward.officer.fort@cochismartcity.dev',
          fullName: 'Rajesh Kumar',
          phoneNumber: '+919876543211',
          password: await bcrypt.hash('ward123', 10),
          role: 'WARD_OFFICER',
          wardId: wards[0].id,
          department: 'Administration',
          language: 'en',
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'ward.officer.mattancherry@cochismartcity.dev',
          fullName: 'Priya Nair',
          phoneNumber: '+919876543212',
          password: await bcrypt.hash('ward123', 10),
          role: 'WARD_OFFICER',
          wardId: wards[1].id,
          department: 'Administration',
          language: 'en',
          isActive: true,
        },
      }),
    ]);

    // Create maintenance team members
    console.log('🔧 Creating maintenance team...');
    const maintenanceTeam = await Promise.all([
      prisma.user.create({
        data: {
          email: 'maintenance.roads@cochismartcity.dev',
          fullName: 'Suresh Babu',
          phoneNumber: '+919876543213',
          password: await bcrypt.hash('maint123', 10),
          role: 'MAINTENANCE_TEAM',
          department: departments[0].name,
          language: 'en',
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'maintenance.waste@cochismartcity.dev',
          fullName: 'Anitha Joseph',
          phoneNumber: '+919876543214',
          password: await bcrypt.hash('maint123', 10),
          role: 'MAINTENANCE_TEAM',
          department: departments[1].name,
          language: 'en',
          isActive: true,
        },
      }),
    ]);

    // Create test citizens
    console.log('👥 Creating test citizens...');
    const citizens = await Promise.all([
      prisma.user.create({
        data: {
          email: 'citizen1@example.com',
          fullName: 'Arun Krishnan',
          phoneNumber: '+919876543215',
          password: await bcrypt.hash('citizen123', 10),
          role: 'CITIZEN',
          wardId: wards[0].id,
          language: 'en',
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'citizen2@example.com',
          fullName: 'Deepa Menon',
          phoneNumber: '+919876543216',
          password: await bcrypt.hash('citizen123', 10),
          role: 'CITIZEN',
          wardId: wards[1].id,
          language: 'ml',
          isActive: true,
        },
      }),
    ]);

    // Create sample complaints
    console.log('📝 Creating sample complaints...');
    const complaints = await Promise.all([
      prisma.complaint.create({
        data: {
          complaintId: 'KSC0001',
          title: 'Pothole on Princess Street',
          description: 'Large pothole causing traffic issues and vehicle damage near the main market area.',
          type: 'ROADS_INFRASTRUCTURE',
          status: 'REGISTERED',
          priority: 'HIGH',
          slaStatus: 'ON_TIME',
          wardId: wards[0].id,
          subZoneId: subZones[0].id,
          area: 'Princess Street Market',
          landmark: 'Near State Bank ATM',
          address: 'Princess Street, Fort Kochi',
          coordinates: JSON.stringify({ lat: 9.9647, lng: 76.2424 }),
          contactName: 'Arun Krishnan',
          contactEmail: 'citizen1@example.com',
          contactPhone: '+919876543215',
          submittedById: citizens[0].id,
          assignedToId: wardOfficers[0].id,
          submittedOn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          assignedOn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        },
      }),
      prisma.complaint.create({
        data: {
          complaintId: 'KSC0002',
          title: 'Garbage not collected',
          description: 'Garbage has not been collected for 3 days in Jew Town area. Creating unhygienic conditions.',
          type: 'WASTE_MANAGEMENT',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          slaStatus: 'WARNING',
          wardId: wards[1].id,
          subZoneId: subZones[2].id,
          area: 'Jew Town',
          landmark: 'Near Paradesi Synagogue',
          address: 'Synagogue Lane, Mattancherry',
          coordinates: JSON.stringify({ lat: 9.9578, lng: 76.2367 }),
          contactName: 'Deepa Menon',
          contactEmail: 'citizen2@example.com',
          contactPhone: '+919876543216',
          submittedById: citizens[1].id,
          assignedToId: maintenanceTeam[1].id,
          submittedOn: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          assignedOn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        },
      }),
      prisma.complaint.create({
        data: {
          complaintId: 'KSC0003',
          title: 'Street light not working',
          description: 'Street light pole number SL-456 not working for past week. Area becomes dark at night.',
          type: 'ELECTRICAL',
          status: 'RESOLVED',
          priority: 'LOW',
          slaStatus: 'COMPLETED',
          wardId: wards[2].id,
          area: 'MG Road',
          landmark: 'Near GCDA Shopping Complex',
          address: 'MG Road, Ernakulam',
          coordinates: JSON.stringify({ lat: 9.9816, lng: 76.2999 }),
          contactName: 'Anonymous Citizen',
          contactPhone: '+919876543217',
          isAnonymous: true,
          assignedToId: maintenanceTeam[0].id,
          submittedOn: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          assignedOn: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
          resolvedOn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (completed late)
        },
      }),
    ]);

    // Create system configuration
    console.log('⚙️ Creating system configuration...');
    const systemConfigs = await Promise.all([
      prisma.systemConfig.create({
        data: {
          key: 'COMPLAINT_ID_PREFIX',
          value: 'KSC',
          description: 'Prefix for complaint IDs',
          isActive: true,
        },
      }),
      prisma.systemConfig.create({
        data: {
          key: 'SLA_HOURS_HIGH',
          value: '24',
          description: 'SLA hours for high priority complaints',
          isActive: true,
        },
      }),
      prisma.systemConfig.create({
        data: {
          key: 'SLA_HOURS_MEDIUM',
          value: '72',
          description: 'SLA hours for medium priority complaints',
          isActive: true,
        },
      }),
      prisma.systemConfig.create({
        data: {
          key: 'SLA_HOURS_LOW',
          value: '168',
          description: 'SLA hours for low priority complaints',
          isActive: true,
        },
      }),
      prisma.systemConfig.create({
        data: {
          key: 'MAX_FILE_SIZE',
          value: '10485760',
          description: 'Maximum file upload size in bytes (10MB)',
          isActive: true,
        },
      }),
    ]);

    console.log('✅ Development database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${wards.length} wards created`);
    console.log(`   • ${subZones.length} sub-zones created`);
    console.log(`   • ${departments.length} departments created`);
    console.log(`   • ${1 + wardOfficers.length + maintenanceTeam.length + citizens.length} users created`);
    console.log(`   • ${complaints.length} sample complaints created`);
    console.log(`   • ${systemConfigs.length} system configurations created`);

    console.log('\n🔑 Test Accounts:');
    console.log('   Admin: admin@cochismartcity.dev / admin123');
    console.log('   Ward Officer (Fort): ward.officer.fort@cochismartcity.dev / ward123');
    console.log('   Ward Officer (Mattancherry): ward.officer.mattancherry@cochismartcity.dev / ward123');
    console.log('   Maintenance (Roads): maintenance.roads@cochismartcity.dev / maint123');
    console.log('   Maintenance (Waste): maintenance.waste@cochismartcity.dev / maint123');
    console.log('   Citizen 1: citizen1@example.com / citizen123');
    console.log('   Citizen 2: citizen2@example.com / citizen123');

  } catch (error) {
    console.error('❌ Error seeding development database:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
