import mongoose, {Schema} from "mongoose";
// Importing mongoose-aggregate-paginate-v2 for adding pagination support to aggregate queries
// This plugin enables efficient pagination of MongoDB aggregate results
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile: {  // cloudinary url
        type:String,
        required: true,
    },
    thumbnail:{  // cloudinary url
        type: String,
        required: true,
    },
    title:{
        type: String,
        required: true,
    },
    description:{
        type: String,
        required: true,
    },
    duration:{  // cloudinary url
        type: Number,
        required: true,
    },
    views:{
        type: Number,
        default: 0,
    },
    isPublished:{
        type: Boolean,
        default: true,
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User",
    }
},{timestamps: true});

// Applying the pagination plugin to the video schema
// This adds aggregatePaginate method to the Video model
// Enables features like:
// - Pagination of video results
// - Sorting and filtering
// - Total count of videos
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video",videoSchema);
