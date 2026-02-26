// --- Chart Color Helpers ---

export const getBarColor = (index) => {
  const colors = [
    '#1b2a47',
    '#22365f',
    '#253a64',
    '#283f6d',
    '#2f4b82',
    '#375798',
    '#3960ac',
    '#4c72be',
  ];
  return colors[index % colors.length];
};

export const getPaymentMethodColor = (index) => {
  const colors = ['#1b2a47', '#1b2a47', '#1b2a47'];
  return colors[index];
};


// --- Chart Data Helpers ---

export const getRevenueByHour = (transactions) => {
  const hours = [
    '12AM', '1AM',  '2AM',  '3AM',  '4AM',  '5AM',
    '6AM',  '7AM',  '8AM',  '9AM',  '10AM', '11AM',
    '12PM', '1PM',  '2PM',  '3PM',  '4PM',  '5PM',
    '6PM',  '7PM',  '8PM',  '9PM',  '10PM', '11PM',
  ];
  return hours.map((h) => ({
    time: h,
    amount: transactions
      .filter((t) => t.hour === h)
      .reduce((acc, curr) => acc + curr.rawAmount, 0),
  }));
};

export const getCategoryData = (transactions) => {
  const counts = {};
  transactions.forEach((t) => {
    t.items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + item.qty;
    });
  });
  const data = Object.keys(counts).map((key) => ({ name: key, value: counts[key] }));
  return data.length > 0 ? data : [{ name: 'None', value: 0 }];
};

export const getPaymentMethodStats = (transactions) => {
  const totalCount = transactions.length;
  if (totalCount === 0) return [];

  const methods = ['Mobile Payment', 'Credit/Debit Card', 'Cash Payment'];
  return methods.map((m, index) => {
    const count = transactions.filter((t) => t.method === m).length;
    const percentage = Math.round((count / totalCount) * 100);
    return {
      name: m,
      count,
      percentage,
      color: getPaymentMethodColor(index),
    };
  });
};
