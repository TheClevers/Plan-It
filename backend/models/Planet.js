import mongoose from "mongoose";

//행성별로 완료한 일을 기억하기
const completedTodoSchema = new mongoose.Schema({
  text: { type: String, required: true },
  category: { type: String, default: "Uncategorized" },
  completedAt: { type: Date, default: Date.now },
}, { _id: true }); 

const planetSchema = new mongoose.Schema({
  category: { type: String, required: true, trim: true}, //category가 unique name으로
  // URL/filename 저장
  image: { type: String, default: null},      
  color: { type: String, default: "#ffffff" },  
  //name: { type: String, index: true },  
  completedTodos: { type: [completedTodoSchema], default: []},
  clientId: { type: String, index: true},
  createdAt: { type: Date, default: Date.now }
});

const Planet = mongoose.model("Planet", planetSchema);
export default Planet; 