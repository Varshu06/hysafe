
export const PRODUCTS = [
  {
    id: '1',
    name: '20L Water Can',
    price: 30,
    deliveryCharge: 'Free',
    image: 'https://via.placeholder.com/150?text=20L+Can', // Replace with real asset later
    volume: '20L'
  },
  {
    id: '2',
    name: '300ml Bottle',
    price: 10,
    deliveryCharge: 'Free',
    image: 'https://via.placeholder.com/150?text=300ml',
    volume: '300ml'
  },
  {
    id: '3',
    name: '5L Water Can',
    price: 40,
    deliveryCharge: 'Free',
    image: 'https://via.placeholder.com/150?text=5L+Can',
    volume: '5L'
  },
  {
    id: '4',
    name: '1L Bottle',
    price: 20,
    deliveryCharge: 'Free',
    image: 'https://via.placeholder.com/150?text=1L+Bottle',
    volume: '1L'
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

