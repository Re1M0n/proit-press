import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import getProfilePicUrlSafe from "../../helpers/GetProfilePicUrlSafe";
import { getWbot } from "../../libs/wbot";

const GetProfilePicUrl = async (number: string): Promise<string> => {
  try {
    const defaultWhatsapp = await GetDefaultWhatsApp();
    const wbot = await getWbot(defaultWhatsapp.id);
    const profilePicUrl = await getProfilePicUrlSafe(wbot, `${number}@c.us`);
    return profilePicUrl || "";
  } catch (err) {
    return "";
  }
};

export default GetProfilePicUrl;
