import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
    //clientId: 사용자 별 ID 확인 위해서
    clientId: { type: String, index: true, sparse: true },
    //할 일 내용 
    //자동 trimming 적용
    text: { type: String, required: [true, "할 일을 작성해주세요!"], trim: true },
    //기본 카테고리 : Uncategorized
    category: { type: String, default: 'Uncategorized', index: true},
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
}, 
    //createdAt, updatedAt 확인가능
    { timestamps: true }
);

const Todo = mongoose.model("Todo", todoSchema);

export default Todo; 