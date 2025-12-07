import mongoose from "mongoose";
const { Schema } = mongoose;

// Subdocument for each job done on the planet
const jobDoneSchema = new Schema(
  {
    //할 일 내용
    todo_name: {
      type: String,
      required: [true, "할 일을 작성해주세요!"],
      trim: true,
    },
    //planet_id:  {type: String,default: 'NONEPLANET',index: true},
    //기본 카테고리 : Uncategorized
    //category: { type: String, default: 'Uncategorized', index: true},
    //is_completed: { type: Boolean, default: false },
    completed_at: { type: Date, default: null },
    username: { type: String, index: true, sparse: true },
  },
  { _id: true } // keep _id for each job if you want to reference/remove individually
);

const planetSchema = new Schema(
  {
    planet_id: { type: String, requried: true, unique: true },
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    s3_image_url: { type: String, default: null, trim: true },
    // Short introduction / description
    introduction: { type: String, default: null, trim: true },
    // Population - use Number (could be integer or BigInt depending on scale)
    population: { type: Number, default: 0 },
    // Major industry or industries (string or array - using string here)
    major_industry: { type: String, default: "NO INDUSTRY", trim: true },
    // SPECIFIC??
    specifics: { type: String, default: "NO SPECIFICS" },
    jobs_done: { type: [jobDoneSchema], default: [] },
    username: { type: String, required: true, index: true },
  },
  {
    // Map createdAt -> created_at and updatedAt -> updated_at
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const Planet = mongoose.model("Planet", planetSchema);
export default Planet;
