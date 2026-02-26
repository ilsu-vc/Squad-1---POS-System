// Import Product Images
import medicineImg from '../assets/images/medicine.png';
import vitaminsImg from '../assets/images/vitamins&supplements.png';
import personalCareImg from '../assets/images/personalcare.png';
import firstAidImg from '../assets/images/firstaid.png';
import healthWellnessImg from '../assets/images/health&wellness.png';
import babyCareImg from '../assets/images/babycare.png';

export const products = [
  { id: 1,  name: 'Acetaminophen 500mg',          price: 8.99,  image: medicineImg,       stock: 150, category: 'OTC Medications' },
  { id: 2,  name: 'Ibuprofen 200mg',               price: 9.49,  image: medicineImg,       stock: 200, category: 'OTC Medications' },
  { id: 3,  name: 'Aspirin 81mg',                  price: 7.99,  image: medicineImg,       stock: 180, category: 'OTC Medications' },
  { id: 4,  name: 'Allergy Relief (Loratadine)',   price: 12.99, image: medicineImg,       stock: 120, category: 'OTC Medications' },
  { id: 5,  name: 'Cough Syrup',                   price: 10.99, image: medicineImg,       stock: 85,  category: 'OTC Medications' },
  { id: 6,  name: 'Antacid Tablets',               price: 8.49,  image: medicineImg,       stock: 160, category: 'OTC Medications' },
  { id: 7,  name: 'Cold & Flu Relief',             price: 11.99, image: medicineImg,       stock: 95,  category: 'OTC Medications' },
  { id: 8,  name: 'Multivitamin Daily',            price: 15.99, image: vitaminsImg,       stock: 140, category: 'Vitamins & Supplements' },
  { id: 9,  name: 'Vitamin D3 2000 IU',            price: 12.99, image: vitaminsImg,       stock: 110, category: 'Vitamins & Supplements' },
  { id: 10, name: 'Vitamin C 1000mg',              price: 13.49, image: vitaminsImg,       stock: 130, category: 'Vitamins & Supplements' },
  { id: 11, name: 'Omega-3 Fish Oil',              price: 18.99, image: vitaminsImg,       stock: 90,  category: 'Vitamins & Supplements' },
  { id: 12, name: 'Calcium + Vitamin D',           price: 14.99, image: vitaminsImg,       stock: 105, category: 'Vitamins & Supplements' },
  { id: 13, name: 'Probiotic Complex',             price: 24.99, image: vitaminsImg,       stock: 75,  category: 'Vitamins & Supplements' },
  { id: 14, name: 'Hand Sanitizer 8oz',            price: 5.99,  image: personalCareImg,   stock: 220, category: 'Personal Care' },
  { id: 15, name: 'Toothpaste Whitening',          price: 6.49,  image: personalCareImg,   stock: 180, category: 'Personal Care' },
  { id: 16, name: 'Mouthwash Antiseptic',          price: 7.99,  image: personalCareImg,   stock: 140, category: 'Personal Care' },
  { id: 17, name: 'Dental Floss',                  price: 3.99,  image: personalCareImg,   stock: 200, category: 'Personal Care' },
  { id: 18, name: 'Body Lotion 16oz',              price: 9.99,  image: personalCareImg,   stock: 100, category: 'Personal Care' },
  { id: 19, name: 'Sunscreen SPF 50',              price: 12.99, image: personalCareImg,   stock: 85,  category: 'Personal Care' },
  { id: 20, name: 'Shampoo & Conditioner',         price: 11.99, image: personalCareImg,   stock: 120, category: 'Personal Care' },
  { id: 21, name: 'Adhesive Bandages (100ct)',     price: 6.99,  image: firstAidImg,       stock: 150, category: 'First Aid' },
  { id: 22, name: 'Gauze Pads Sterile',            price: 8.49,  image: firstAidImg,       stock: 110, category: 'First Aid' },
  { id: 23, name: 'Medical Tape',                  price: 4.99,  image: firstAidImg,       stock: 130, category: 'First Aid' },
  { id: 24, name: 'Antiseptic Wipes (50ct)',       price: 7.49,  image: firstAidImg,       stock: 140, category: 'First Aid' },
  { id: 25, name: 'First Aid Kit',                 price: 24.99, image: firstAidImg,       stock: 45,  category: 'First Aid' },
  { id: 26, name: 'Thermometer Digital',           price: 12.99, image: firstAidImg,       stock: 65,  category: 'First Aid' },
  { id: 27, name: 'Blood Pressure Monitor',        price: 49.99, image: healthWellnessImg, stock: 35,  category: 'Health & Wellness' },
  { id: 28, name: 'Glucose Test Strips (50ct)',    price: 32.99, image: healthWellnessImg, stock: 55,  category: 'Health & Wellness' },
  { id: 29, name: 'Heating Pad Electric',          price: 29.99, image: healthWellnessImg, stock: 40,  category: 'Health & Wellness' },
  { id: 30, name: 'Compression Socks',             price: 16.99, image: healthWellnessImg, stock: 80,  category: 'Health & Wellness' },
  { id: 31, name: 'Sleep Aid Tablets',             price: 14.99, image: healthWellnessImg, stock: 95,  category: 'Health & Wellness' },
  { id: 32, name: 'Eye Drops Lubricating',         price: 9.99,  image: healthWellnessImg, stock: 120, category: 'Health & Wellness' },
  { id: 33, name: 'Baby Diapers (Size 3)',         price: 24.99, image: babyCareImg,       stock: 70,  category: 'Baby Care' },
  { id: 34, name: 'Baby Wipes (80ct)',             price: 6.99,  image: babyCareImg,       stock: 150, category: 'Baby Care' },
  { id: 35, name: 'Baby Lotion 16oz',              price: 8.99,  image: babyCareImg,       stock: 90,  category: 'Baby Care' },
  { id: 36, name: 'Baby Powder',                   price: 5.99,  image: babyCareImg,       stock: 110, category: 'Baby Care' },
  { id: 37, name: 'Diaper Rash Cream',             price: 7.99,  image: babyCareImg,       stock: 100, category: 'Baby Care' },
];

export const categories = [
  'All',
  'OTC Medications',
  'Vitamins & Supplements',
  'Personal Care',
  'First Aid',
  'Health & Wellness',
  'Baby Care',
];
