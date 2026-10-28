import Setting from "../../models/Setting";

interface Request {
  key: string;
}

/**
 * Devuelve el ajuste con esa clave, o undefined si no existe.
 *
 * La fila ausente no es un error: los ajustes son opcionales y todos los que
 * llaman a este servicio deciden el valor por defecto con `?.`. Lanzar acá
 * convertía una configuración que nunca se guardó en un 500 en endpoints que
 * no tienen nada que ver, como el listado de tickets (las claves de orden
 * vienen de seeds, que el deploy de producción no corre).
 */
const ListSettingsServiceOne = async ({
  key
}: Request): Promise<Setting | undefined> => {
  const setting = await Setting.findOne({
    where: { key }
  });

  return setting || undefined;
};

export default ListSettingsServiceOne;