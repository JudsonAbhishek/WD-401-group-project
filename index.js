const express = require('express');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const serviceAccount = require("./keys.json");
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'loginup.html'));
});


app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const collection = role === "admin" ? "admin_info" : "user_sign";
    const usersRef = db.collection(collection);
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      res.send('<script>alert("User authentication details do not match. Go back and re-enter correct details."); window.history.back();</script>');
    } else {
      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();
      const isPasswordMatch = await bcrypt.compare(password, userData.password);

      if (isPasswordMatch) {
        const redirectPath = role === "admin" ? '/mains.html' : '/main.html';
        res.redirect(redirectPath);
      } else {
        res.send('<script>alert("User authentication details do not match. Go back and re-enter correct details."); window.history.back();</script>');
      }
    }
  } catch (error) {
    console.error('Error checking document: ', error);
    res.status(500).send('Error checking login data');
  }
});


app.post("/signup", async (req, res) => {
  const { email, password, name, age, role } = req.body;

  try {
    const collection = role === "admin" ? "admin_info" : "user_sign";
    const usersRef = db.collection(collection);
    const snapshot = await usersRef.where('email', '==', email).get();

    if (!snapshot.empty) {
      res.send('<script>alert("Email already exists. Please use a different email."); window.history.back();</script>');
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { email, password: hashedPassword, name, age };
      await usersRef.add(newUser);
      res.send('<script>alert("Signup data saved successfully. Please login now."); window.location.href="/";</script>');
    }
  } catch (error) {
    console.error('Error adding document: ', error);
    res.status(500).send('Error saving signup data');
  }
});


app.get('/main.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));// main for users
});


app.get('/mains.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'mains.html'));//mains for admin
});

app.post('/register-donor', async (req, res) => {
  const { name, location, blood_group,contact } = req.body;

  try {
    await db.collection('donors').add({ name, location, blood_group,contact });
    console.log("Donor registered successfully, serving done.html");
    res.sendFile(path.join(__dirname, 'done.html'));
  } catch (error) {
    console.error('Error registering donor: ', error);
    res.status(500).send('Error registering donor');
  }
});

app.post('/register-receiver', async (req, res) => {
  const { name, location, blood_group, contact } = req.body;

  try {
    await db.collection('receivers').add({ name, location, blood_group, contact });
    console.log("Receiver registered successfully, serving done.html");
    res.sendFile(path.join(__dirname, 'done.html'));
  } catch (error) {
    console.error('Error registering receiver: ', error);
    res.status(500).send('Error registering receiver');
  }
});


app.get('/donors', async (req, res) => {
  try {
    const snapshot = await db.collection('donors').get();
    const donors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(donors);
  } catch (error) {
    console.error('Error fetching donors: ', error);
    res.status(500).send('Error fetching donors');
  }
});

app.get('/receivers', async (req, res) => {
  try {
    const snapshot = await db.collection('receivers').get();
    const receivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(receivers);
  } catch (error) {
    console.error('Error fetching receivers: ', error);
    res.status(500).send('Error fetching receivers');
  }
});


app.get('/get-admin-message', async (req, res) => {
  try {
    const snapshot = await db.collection('admin_messages').orderBy('timestamp', 'desc').limit(1).get();
    if (snapshot.empty) {
      res.json({ message: "No emergency message available." });
    } else {
      res.json(snapshot.docs[0].data());
    }
  } catch (error) {
    console.error('Error fetching admin message: ', error);
    res.status(500).send('Error fetching admin message');
  }
});


app.post('/store-message', async (req, res) => {
  const { message } = req.body;
  try {
    const docRef = db.collection('admin_messages').doc();
    await docRef.set({ message, timestamp: new Date() });
    res.json({ message: "Admin message stored successfully." });
  } catch (error) {
    console.error('Error storing admin message: ', error);
    res.status(500).send('Error storing admin message');
  }
});


app.post('/logout', (req, res) => {
  res.redirect('/');
});


app.listen(7000, () => {
  console.log("Server is running at http://localhost:7000/");
});
