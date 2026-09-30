import dotenv from "dotenv";

dotenv.config();

if(!process.env.MONGO_URI){
    throw new Error("Mongo uri is not defined")
}
if(!process.env.JWT_SECRET){
    throw new Error("JWT SECRET is not defined")
}

const config ={
    MONGO_URI:process.env.MONGO_URI,
    JWT_SECRET:process.env.JWT_SECRET
}
export default config;