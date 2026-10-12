import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Bike Auction Database...');

  // Clean existing records
  await prisma.bid.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.bike.deleteMany();
  await prisma.user.deleteMany();

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const buyerPassword = await bcrypt.hash('Buyer@123', salt);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@vutto.com',
      passwordHash: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      balance: 1000000.0,
    },
  });

  const elena = await prisma.user.create({
    data: {
      email: 'elena@vutto.com',
      passwordHash: buyerPassword,
      name: 'Elena Rostova',
      role: 'BUYER',
      balance: 150000.0,
    },
  });

  const marcus = await prisma.user.create({
    data: {
      email: 'marcus@vutto.com',
      passwordHash: buyerPassword,
      name: 'Marcus Vance',
      role: 'BUYER',
      balance: 120000.0,
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: 'alex@vutto.com',
      passwordHash: buyerPassword,
      name: 'Alex Chen',
      role: 'BUYER',
      balance: 95000.0,
    },
  });

  console.log('Created Users: Admin and 3 Buyers.');

  // 2. Create Motorcycles
  const ducati = await prisma.bike.create({
    data: {
      make: 'Ducati',
      model: 'Panigale V4 S',
      year: 2023,
      engineCc: 1103,
      mileage: 1240,
      vin: 'ZDM14AEW2PB001928',
      conditionScore: 9.8,
      inspectionSummary: 'Showroom condition. Single owner, garage kept. Full Ducati service record, ceramic coated paint, tires at 92% tread life.',
      location: 'Austin, TX',
      primaryImage: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
      imagesJson: JSON.stringify([
        'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1558980664-769d59546b3d?auto=format&fit=crop&w=1200&q=80',
      ]),
      specsJson: JSON.stringify({
        horsepower: '215.5 HP @ 13,000 rpm',
        torque: '123.6 Nm @ 9,500 rpm',
        exhaust: 'Akrapovič Full Titanium Racing Exhaust',
        transmission: '6-speed with Ducati Quick Shift (DQS) Up/Down EVO 2',
        weight: '195.5 kg (wet)',
        suspension: 'Öhlins Smart EC 2.0 electronic suspension',
      }),
    },
  });

  const yamaha = await prisma.bike.create({
    data: {
      make: 'Yamaha',
      model: 'YZF-R1M Carbon Special',
      year: 2024,
      engineCc: 998,
      mileage: 680,
      vin: 'JYARN39E8LA004512',
      conditionScore: 9.9,
      inspectionSummary: 'Factory pristine with Carbon bodywork. Factory electronic racing suspension, communication control unit (CCU) with GPS logging.',
      location: 'Los Angeles, CA',
      primaryImage: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
      imagesJson: JSON.stringify([
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
      ]),
      specsJson: JSON.stringify({
        horsepower: '200 HP @ 13,500 rpm',
        torque: '113.3 Nm @ 11,500 rpm',
        exhaust: 'Titanium Crossplane Exhaust',
        transmission: '6-speed multi-plate slipper clutch',
        weight: '202 kg (wet)',
        suspension: 'Öhlins Electronic Racing Suspension (ERS) NPX fork',
      }),
    },
  });

  const bmw = await prisma.bike.create({
    data: {
      make: 'BMW',
      model: 'M 1000 RR 50 Years Edition',
      year: 2023,
      engineCc: 999,
      mileage: 2150,
      vin: 'WB10E0202PZZ00881',
      conditionScore: 9.6,
      inspectionSummary: 'Sao Paulo Yellow M Anniversary livery with carbon winglets producing 22.6 kg downforce at 300 km/h. M Endurance DLC chain.',
      location: 'Miami, FL',
      primaryImage: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80',
      imagesJson: JSON.stringify([
        'https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
      ]),
      specsJson: JSON.stringify({
        horsepower: '212 HP @ 14,500 rpm',
        torque: '113 Nm @ 11,000 rpm',
        exhaust: 'Full Titanium Akrapovič',
        transmission: '6-speed anti-hopping clutch',
        weight: '192 kg (wet with M Package)',
        wheels: 'M Carbon 7-spoke wheels',
      }),
    },
  });

  const harley = await prisma.bike.create({
    data: {
      make: 'Harley-Davidson',
      model: 'Fat Boy 114 Custom',
      year: 2022,
      engineCc: 1868,
      mileage: 4100,
      vin: '1HD1YBF24NB012399',
      conditionScore: 9.3,
      inspectionSummary: 'Lakester solid cast disc aluminum wheels, Stage 1 Vance & Hines high output pipes, Screamin Eagle performance tune.',
      location: 'Nashville, TN',
      primaryImage: 'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?auto=format&fit=crop&w=1200&q=80',
      imagesJson: JSON.stringify([
        'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
      ]),
      specsJson: JSON.stringify({
        engine: 'Milwaukee-Eight 114 V-Twin',
        torque: '158 Nm @ 3,250 rpm',
        exhaust: 'Vance & Hines Big Radius 2-into-2',
        transmission: '6-speed Cruise Drive',
        weight: '317 kg',
        finish: 'Chrome & Vivid Black dual tone',
      }),
    },
  });

  const triumph = await prisma.bike.create({
    data: {
      make: 'Triumph',
      model: 'Bonneville Bobber Stealth Edition',
      year: 2023,
      engineCc: 1200,
      mileage: 1800,
      vin: 'SMTT02NE8NP998231',
      conditionScore: 9.5,
      inspectionSummary: 'Hand-painted matte silver/ice finish, floating aluminum single seat pan, Brembo front twin disc brakes, Showa cartridge forks.',
      location: 'Denver, CO',
      primaryImage: 'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?auto=format&fit=crop&w=1200&q=80',
      imagesJson: JSON.stringify([
        'https://images.unsplash.com/photo-1558981420-87aa9dad1c89?auto=format&fit=crop&w=1200&q=80',
      ]),
      specsJson: JSON.stringify({
        engine: '1200cc High-Torque parallel-twin, 270° firing angle',
        horsepower: '78 HP @ 6,100 rpm',
        torque: '106 Nm @ 4,000 rpm',
        exhaust: 'Brushed stainless steel 2-into-2 twin-skin',
        transmission: '6-speed torque-assist clutch',
        wheels: 'Wire spoked 16" black rims',
      }),
    },
  });

  console.log('Created 5 premium motorcycles.');

  // 3. Create Auctions
  const now = new Date();
  
  // Auction 1: LIVE (Ducati) - Ends in 25 minutes
  const ducatiEndTime = new Date(now.getTime() + 25 * 60 * 1000);
  const ducatiAuction = await prisma.auction.create({
    data: {
      title: '2023 Ducati Panigale V4 S - Akrapovič Titanium Track Spec',
      bikeId: ducati.id,
      startingPrice: 22000,
      reservePrice: 27000,
      minIncrement: 250,
      currentBid: 28500,
      currentWinnerId: elena.id,
      status: 'LIVE',
      startTime: new Date(now.getTime() - 45 * 60 * 1000),
      endTime: ducatiEndTime,
      originalEndTime: ducatiEndTime,
      antiSnipingSeconds: 60,
      antiSnipingExtensionsCount: 0,
      isReserveMet: true,
      createdById: admin.id,
    },
  });

  // Historical bids for Ducati
  await prisma.bid.createMany({
    data: [
      {
        auctionId: ducatiAuction.id,
        bidderId: alex.id,
        amount: 23000,
        timestamp: new Date(now.getTime() - 35 * 60 * 1000),
        isWinning: false,
      },
      {
        auctionId: ducatiAuction.id,
        bidderId: marcus.id,
        amount: 25000,
        timestamp: new Date(now.getTime() - 25 * 60 * 1000),
        isWinning: false,
      },
      {
        auctionId: ducatiAuction.id,
        bidderId: alex.id,
        amount: 27250,
        timestamp: new Date(now.getTime() - 15 * 60 * 1000),
        isWinning: false,
      },
      {
        auctionId: ducatiAuction.id,
        bidderId: elena.id,
        amount: 28500,
        timestamp: new Date(now.getTime() - 4 * 60 * 1000),
        isWinning: true,
      },
    ],
  });

  // Auction 2: LIVE (Yamaha R1M) - Ends in 8 minutes (Great for live test bidding!)
  const r1mEndTime = new Date(now.getTime() + 8 * 60 * 1000);
  const r1mAuction = await prisma.auction.create({
    data: {
      title: '2024 Yamaha YZF-R1M Carbon - Factory Öhlins ERS & GPS Logger',
      bikeId: yamaha.id,
      startingPrice: 20000,
      reservePrice: 24000,
      minIncrement: 200,
      currentBid: 24600,
      currentWinnerId: marcus.id,
      status: 'LIVE',
      startTime: new Date(now.getTime() - 52 * 60 * 1000),
      endTime: r1mEndTime,
      originalEndTime: r1mEndTime,
      antiSnipingSeconds: 60,
      antiSnipingExtensionsCount: 0,
      isReserveMet: true,
      createdById: admin.id,
    },
  });

  await prisma.bid.createMany({
    data: [
      {
        auctionId: r1mAuction.id,
        bidderId: elena.id,
        amount: 21000,
        timestamp: new Date(now.getTime() - 40 * 60 * 1000),
        isWinning: false,
      },
      {
        auctionId: r1mAuction.id,
        bidderId: marcus.id,
        amount: 24600,
        timestamp: new Date(now.getTime() - 6 * 60 * 1000),
        isWinning: true,
      },
    ],
  });

  // Auction 3: LIVE (BMW M 1000 RR) - Ends in 45 minutes
  const bmwEndTime = new Date(now.getTime() + 45 * 60 * 1000);
  const bmwAuction = await prisma.auction.create({
    data: {
      title: '2023 BMW M 1000 RR 50 Years M Edition - Carbon Aero Package',
      bikeId: bmw.id,
      startingPrice: 32000,
      reservePrice: 36000,
      minIncrement: 500,
      currentBid: 34500,
      currentWinnerId: alex.id,
      status: 'LIVE',
      startTime: new Date(now.getTime() - 15 * 60 * 1000),
      endTime: bmwEndTime,
      originalEndTime: bmwEndTime,
      antiSnipingSeconds: 60,
      antiSnipingExtensionsCount: 0,
      isReserveMet: false,
      createdById: admin.id,
    },
  });

  await prisma.bid.create({
    data: {
      auctionId: bmwAuction.id,
      bidderId: alex.id,
      amount: 34500,
      timestamp: new Date(now.getTime() - 8 * 60 * 1000),
      isWinning: true,
    },
  });

  // Auction 4: UPCOMING (Harley-Davidson) - Starts in 3 hours
  const harleyStartTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const harleyEndTime = new Date(harleyStartTime.getTime() + 2 * 60 * 60 * 1000);
  await prisma.auction.create({
    data: {
      title: '2022 Harley-Davidson Fat Boy 114 - Vance & Hines Stage 1',
      bikeId: harley.id,
      startingPrice: 16500,
      reservePrice: 19000,
      minIncrement: 200,
      currentBid: 16500,
      status: 'UPCOMING',
      startTime: harleyStartTime,
      endTime: harleyEndTime,
      originalEndTime: harleyEndTime,
      antiSnipingSeconds: 60,
      antiSnipingExtensionsCount: 0,
      isReserveMet: false,
      createdById: admin.id,
    },
  });

  // Auction 5: ENDED & SETTLED (Triumph Bobber)
  const triumphStartTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const triumphEndTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const triumphAuction = await prisma.auction.create({
    data: {
      title: '2023 Triumph Bonneville Bobber Stealth Edition - Custom Wire Spoke',
      bikeId: triumph.id,
      startingPrice: 11000,
      reservePrice: 13000,
      minIncrement: 150,
      currentBid: 14200,
      currentWinnerId: elena.id,
      status: 'ENDED',
      startTime: triumphStartTime,
      endTime: triumphEndTime,
      originalEndTime: triumphEndTime,
      antiSnipingSeconds: 60,
      antiSnipingExtensionsCount: 1,
      isReserveMet: true,
      createdById: admin.id,
    },
  });

  await prisma.bid.createMany({
    data: [
      {
        auctionId: triumphAuction.id,
        bidderId: marcus.id,
        amount: 12500,
        timestamp: new Date(triumphStartTime.getTime() + 60 * 60 * 1000),
        isWinning: false,
      },
      {
        auctionId: triumphAuction.id,
        bidderId: elena.id,
        amount: 14200,
        timestamp: new Date(triumphEndTime.getTime() - 30 * 1000),
        isWinning: true,
      },
    ],
  });

  // Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'SYSTEM_BOOTSTRAP',
        actorId: admin.id,
        details: JSON.stringify({ message: 'Production seed executed successfully with sample data.' }),
      },
      {
        action: 'AUCTION_STARTED',
        actorId: admin.id,
        details: JSON.stringify({ auctionId: ducatiAuction.id, title: ducatiAuction.title }),
      },
    ],
  });

  console.log('Database seeded successfully with users, bikes, auctions, and bids!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
