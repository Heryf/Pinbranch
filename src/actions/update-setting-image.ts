'use server'

import { prisma } from "@/lib/prisma";


// 上传图片：始终创建新的 Image 记录（新 id），前端 URL 变化从而绕过浏览器缓存
async function uploadImage(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const image = await prisma.image.create({
      data: {
        name: file.name,
        data: buffer,
        mimeType: file.type,
        type: 'setting',
        size: file.size,
        description: `Setting image: ${file.name}`
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        size: true
      }
    });

    return image;
  } catch (error) {
    console.error('Failed to upload image:', error);
    throw new Error(`Failed to upload image ${file.name}`);
  }
}

export async function updateSettingImage(formData: FormData) {
  const settingKey = formData.get('settingKey') as string;
  const file = formData.get('file') as File;

  if (!settingKey || !file) {
    throw new Error('Missing required parameters');
  }

  const setting = await prisma.siteSetting.findUnique({
    where: { key: settingKey },
    include: {
      images: {
        select: { imageId: true }
      }
    }
  });

  if (!setting) {
    throw new Error(`Could not find the corresponding setting item: ${settingKey}`);
  }

  // 1. 上传新图片（新 id）
  const uploadedImage = await uploadImage(file);

  // 2. 删除旧的图片关联，并清理旧图片记录（避免垃圾数据积累）
  const oldImageIds = setting.images.map(img => img.imageId);
  if (oldImageIds.length > 0) {
    await prisma.settingImage.deleteMany({
      where: { settingId: setting.id }
    });
    await prisma.image.deleteMany({
      where: { id: { in: oldImageIds } }
    });
  }

  // 3. 建立新的图片关联
  await prisma.settingImage.create({
    data: {
      settingId: setting.id,
      imageId: uploadedImage.id,
      description: `Setting image: ${file.name}`
    }
  });

  return {
    settingKey,
    success: true,
    image: uploadedImage
  };
}
