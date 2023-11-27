const express = require('express')
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors');
const cookieParser =require('cookie-parser')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o4gyyvr.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// middleware

const verifyToken =async(req,res,next)=>{
  const token = req.cookies?.token;
  console.log('value of token' , token)
  if(!token){
    return res.status(401).send({message: 'forbidden'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN , (error , decoded)=>{
    // error
    if(error){
      console.log(error)
      return res.status(401).send({message:'unauthorize'})
    }
    // if token is valid then decoded

    console.log('value of the token' , decoded)
    req.user= decoded
    next()
  })
  
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection =client.db("carDoctor").collection("bookings");

    // Auth related

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true })
      console.log(user)
    })

  // service related
    app.get('/services' ,async(req,res)=>{
      const cursor =serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/services/:id', async(req,res)=>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const options = {
        // Sort matched documents in descending order by rating
        
        // Include only the `title` and `imdb` fields in the returned document
        projection: {  title: 1,price: 1,service_id :1 ,img:1 },
      };
      const result =await serviceCollection.findOne(query ,options);
      res.send(result)
    })

    // bookings

    app.get('/bookings', verifyToken, async(req,res)=>{
      const result=await bookingCollection.find().toArray();
      console.log('tok tok validtotken', req.user);
      if(req.query.email !== req.user.email){
        return res.status(403).send({message:'Forbidden Access'})
      }
      res.send(result);
      let query={};
      if(req.query?.email){
        query ={email: req.query.email}
      }
    })

    app.post('/bookings',async(req,res)=>{
      const booking= req.body
      console.log(booking)
      const result =await bookingCollection.insertOne(booking)
      res.send(result)
    })


    app.patch('/bookings/:id',async(req,res)=>{
      const id= req.params.id;
      const filter={ _id : new ObjectId(id)}
      const updatedBooking =req.body;
     
      console.log(updatedBooking)
      const updateDoc ={
        $set: {
          status : updatedBooking.status
        }
      };
      const result = await bookingCollection.updateOne(filter, updateDoc )
      res.send(result)
    })


    app.delete('/bookings/:id',async(req,res)=>{
      const id= req.params.id;
      const query={_id : new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })

   

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})