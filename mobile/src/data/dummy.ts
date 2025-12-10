// Import product images
const ProductImages = {
  '1l': require('../assets/1l.png'),
  '2l': require('../assets/2l.png'),
  '20l': require('../assets/20l.png'),
  '250ml': require('../assets/250.png'),
  '300ml': require('../assets/300ml.png'),
  '500ml': require('../assets/500ml.png'),
};

export const PRODUCTS = [
  {
    id: '1',
    name: '20L Water Can',
    price: 30,
    deliveryCharge: 'Free',
    image: ProductImages['20l'],
    volume: '20L'
  },
  {
    id: '2',
    name: '2L Bottle',
    price: 25,
    deliveryCharge: 'Free',
    image: ProductImages['2l'],
    volume: '2L'
  },
  {
    id: '3',
    name: '1L Bottle',
    price: 20,
    deliveryCharge: 'Free',
    image: ProductImages['1l'],
    volume: '1L'
  },
  {
    id: '4',
    name: '500ml Bottle',
    price: 15,
    deliveryCharge: 'Free',
    image: ProductImages['500ml'],
    volume: '500ml'
  },
  {
    id: '5',
    name: '300ml Bottle',
    price: 10,
    deliveryCharge: 'Free',
    image: ProductImages['300ml'],
    volume: '300ml'
  },
  {
    id: '6',
    name: '250ml Bottle',
    price: 8,
    deliveryCharge: 'Free',
    image: ProductImages['250ml'],
    volume: '250ml'
  }
];

export const SAVED_ADDRESSES = [
  {
    id: '1',
    type: 'Home',
    address: '9/482, Btype, 50th street, sidco...',
    fullAddress: '9/482, Btype, 50th street, sidco nagar, chennai-49'
  },
  {
    id: '2',
    type: 'Office',
    address: '9/482, Btype, 50th street, sidco...',
    fullAddress: '9/482, Btype, 50th street, sidco nagar, chennai-49'
  }
];

export const RECENT_SEARCHES = [
  'Office',
  '9/482,Btype,50th street,sidco...'
];

export const ACTIVE_ORDER = {
  id: '12345',
  status: 'on_the_way', // picked_up, on_the_way, delivered
  driverName: 'Shanmugam',
  progress: 0.6, // 60%
  timeline: [
    { status: 'Picked UP', completed: true },
    { status: 'On the Way', completed: true, current: true },
    { status: 'Delivered', completed: false }
  ]
};

export const PAST_ORDERS = [
  {
    id: '101',
    date: '25th May',
    status: 'Completed',
    price: 40,
    driver: 'Baskar',
    address: '9/482, B type, 50th Street...'
  }
];

export const WHY_CHOOSE_US = [
  {
    id: '1',
    title: 'Pure Water',
    description: 'Purified and safe for drinking',
    icon: 'water'
  },
  {
    id: '2',
    title: 'Prompt Delivery',
    description: 'On time, every time',
    icon: 'truck'
  }
];

