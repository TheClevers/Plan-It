import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
  {
    todo_id: { type: String, required: true, unique: true },
    //할 일 내용
    todo_name: {
      type: String,
      required: [true, "할 일을 작성해주세요!"],
      trim: true,
    },
    planet_id: { type: String, default: "NONEPLANET", index: true },
    //기본 카테고리 : Uncategorized
    //category: { type: String, default: 'Uncategorized', index: true},
    is_completed: { type: Boolean, default: false },
    completed_at: { type: Date, default: null },
    //username: 사용자 별 ID 확인 위해서
    username: { type: String, index: true, sparse: true },
  },
  //createdAt, updatedAt 확인가능
  { timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
);

const Todo = mongoose.model("Todo", todoSchema);

export default Todo;
