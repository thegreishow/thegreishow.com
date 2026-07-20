window.WhiteLineUpload = async function (db, file, applicationKey, label, required) {
  if (!(file instanceof File) || !file.size) {
    if (required) throw new Error(`Please select your ${label} file.`);
    return null;
  }
  const isImage = label !== 'resume';
  const allowed = isImage
    ? ['image/jpeg', 'image/png', 'image/webp']
    : ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowed.includes(file.type)) throw new Error(`${label} has an unsupported file type.`);
  if (file.size > 8 * 1024 * 1024) throw new Error(`${label} must be smaller than 8 MB.`);
  const extension = (file.name.split('.').pop() || (isImage ? 'jpg' : 'pdf')).toLowerCase();
  const path = `applications/${applicationKey}/${label}-${crypto.randomUUID()}.${extension}`;
  const { error } = await db.storage.from('talent-submissions').upload(path, file, {
    upsert: false,
    contentType: file.type
  });
  if (error) throw error;
  return path;
};