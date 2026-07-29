import { uploadToCloudinary } from "../providers/cloudinary.js";

export async function uploadImage(env, imageBase64) {

  const url = await uploadToCloudinary(
    env,
    imageBase64
  );

  return {
    imageUrl: url
  };
}
