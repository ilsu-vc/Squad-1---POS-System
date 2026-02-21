// reportWebVitals.js

const reportWebVitals = (metric) => {
  if (metric) {
    console.log(metric); // Logs performance metrics (e.g., LCP, FID, CLS)
  } else {
    console.warn("No metric data received"); // Logs a warning if no data is received
  }
};

export default reportWebVitals;