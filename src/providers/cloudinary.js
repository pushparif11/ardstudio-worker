const CLOUD_NAME = "YOUR_CLOUD_NAME";

export async function uploadToCloudinary(env, imageBase64) {

  const form = new FormData();

  form.append(
    "file",
    `data:image/png;base64,${imageBase64}`
  );

  form.append("upload_preset", env.CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form
    }
  );

  if (!response.ok) {
    throw new Error("Cloudinary upload failed");
  }

  const json = await response.json();

  return json.secure_url;
}
