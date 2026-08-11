import AppError from "../../errors/AppError";
import Video from "../../models/Video";

interface Request {
  id: string;
}

const DeleteVideoService = async ({ id }: Request): Promise<void> => {
  const video = await Video.findByPk(id);

  if (!video) {
    throw new AppError("Vídeo no encontrado", 404);
  }

  await video.destroy();
};

export default DeleteVideoService;
