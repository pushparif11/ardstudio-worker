export async function uploadToCloudinary(env, imageBase64) {

  const form = new FormData();

  form.append(
    "file",
    imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`
  );

  form.append(
    "upload_preset",
    env.CLOUDINARY_UPLOAD_PRESET
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const json = await response.json();

  return json.secure_url;
}
