const https = require("https");
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');  
const fs = require('fs');
const cors = require('cors');

const queryRoutes = require('./data/tra-thuong'); 
const hmdt = require('./data/hmdt'); 
const dsvnpay = require('./data/dsvnpay'); 
const checkerror = require('./data/checkerror'); 
const checkpayment = require('./data/checkpayment'); 
const dsvnpay3site = require('./data/vnpaydoitac'); 
const script = require('./data/script'); 
const command = require('./data/checkcommand'); 
const inforwinner = require('./data/checkinforwinner'); 
const payreward = require('./data/checkpayreward'); 
const vpneo = require('./data/tkvpbankneo');
const mqtneo = require('./data/tkmqtneo');
const withdraw = require('./data/checkwithdraw');
const withdrawrq = require('./data/checkruttien');
const mbbank = require('./data/checkmbbank');
const exportwithdraw = require('./data/rut_tien');
const hmdtblock = require('./data/hmdt_block');
const checksms = require('./data/checksms');
const checkrole = require('./data/checkrole');
const checkncb = require('./data/tkncb');



const app = express();
const PORT = 5000;

app.use(cors({
  origin: "*", // allow any origin or simply restrict to localhost if preferred. For local dev "*" is often fine or "http://localhost:5000"
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());

// Load file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Load file JS nằm trong public/script/*
app.use('/script', express.static(path.join(__dirname, 'public/script')));

console.log("STATIC PATH:", path.join(__dirname, "public"));


// Trả về file index.html khi truy cập "/"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/favicon.ico', (req, res) => res.sendStatus(204));


// API routes
app.use('/', queryRoutes);
app.use('/', hmdt);
app.use('/', dsvnpay);
app.use('/', checkerror);
app.use('/', checkpayment);
app.use('/', dsvnpay3site);
app.use('/', script);
app.use('/', command);
app.use('/', inforwinner);
app.use('/', payreward);
app.use('/', vpneo);
app.use('/', mqtneo);
app.use('/', withdraw);
app.use('/', mbbank);
app.use('/',withdrawrq);
app.use('/', exportwithdraw);
app.use('/',hmdtblock);
app.use('/api', checksms);
app.use('/api', checkrole);
app.use('/',checkncb);


// Start server
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
