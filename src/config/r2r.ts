import axios from 'axios';

const r2rClient = axios.create({
  baseURL: process.env.R2R_URL || 'https://r2r-py2.onrender.com',
  headers: {
    'Content-Type': 'application/json',
    ...(process.env.R2R_API_KEY && { 'Authorization': `Bearer ${process.env.R2R_API_KEY}` })
  },
  timeout: 30000
});

export default r2rClient;