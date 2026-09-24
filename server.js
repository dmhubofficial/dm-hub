const express=require("express");const path=require("path");const app=express();const PORT=process.env.PORT||3000;
app.use(express.json());app.use(express.static(path.join(__dirname,"public")));
app.get("/{*splat}",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`DM Hub running on http://localhost:${PORT}`));