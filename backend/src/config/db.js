const mongoose = require('mongoose');

let cached = global._mongooseConnection;
if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    // Verify connection is still alive
    if (cached.conn.connection.readyState === 1) {
      return cached.conn;
    }
    // Connection dropped — reset and reconnect
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        // ✅ Removed deprecated useNewUrlParser & useUnifiedTopology
        serverSelectionTimeoutMS: 5000,  // fail fast on cold start
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 1,
      })
      .then((m) => {
        console.log('MongoDB connected successfully');
        return m;
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err.message);
        cached.promise = null; // allow retry on next request
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
};

module.exports = connectDB;