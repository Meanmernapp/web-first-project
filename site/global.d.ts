// Extend the NodeJS Global interface to include mongoose
declare namespace NodeJS {
  interface Global {
    mongoose: {
      conn: any;
      promise: any;
    };
  }
}

export {};
