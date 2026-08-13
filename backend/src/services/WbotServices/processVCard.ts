/* eslint-disable no-plusplus */
/* eslint-disable no-nested-ternary */
import { Message as WbotMessage } from "whatsapp-web.js";

import Ticket from "../../models/Ticket";
import CreateContactService from "../ContactServices/CreateContactService";
import GetContactService from "../ContactServices/GetContactService";

export const buildMultiVCardBody = async (
  msg: WbotMessage,
  ticket: Ticket
): Promise<string | undefined> => {
  let bodyResult: string | undefined;

  if (!msg.body || msg.body === "") {

    if (msg.vCards && Array.isArray(msg.vCards) && msg.vCards.length > 0) {
      const extractedContacts = [];

      const vcardLines = msg.vCards.join(',').split('\n');

      let currentName = '';
      let currentNumber = '';

      for (let i = 0; i < vcardLines.length; i++) {
        const line = vcardLines[i];

        const parts = line.split(':');

        if (parts.length >= 2) {
          const key = parts[0];
          const value = parts.slice(1).join(':');

          if (key === 'FN') {
            currentName = value.trim();
          } else if (key.includes('TEL') && value) {
            currentNumber = value.trim();

            if (currentName && currentNumber) {
              extractedContacts.push({
                name: currentName,
                number: currentNumber
              });
            }
          }
        }
      }

      const processedContacts = [];

      for (const contact of extractedContacts) {
        try {

          try {
            const cont = await CreateContactService({
              name: contact.name,
              number: contact.number.replace(/\D/g, ""),
              whatsappId: ticket.whatsappId
            });
            processedContacts.push({
              id: cont.id,
              name: cont.name,
              number: cont.number
            });
          } catch (error) {
            if (error.message === "ERR_DUPLICATED_CONTACT") {
              const cont = await GetContactService({
                name: contact.name,
                number: contact.number.replace(/\D/g, ""),
                email: ""
              });
              processedContacts.push({
                id: cont.id,
                name: cont.name,
                number: cont.number
              });
            } else {
              throw error;
            }
          }
        } catch (err) {
          console.error(`Error processing contact ${contact.name}:`, err);
        }
      }

      if (processedContacts.length > 0) {
        const jsonData = JSON.stringify(processedContacts);

        try {
          const testParse = JSON.parse(jsonData);

          bodyResult = jsonData;
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
          bodyResult = JSON.stringify([{
            id: 0,
            name: "Contato do vCard",
            number: "Número não disponível"
          }]);
        }
      } else {
        bodyResult = JSON.stringify([{
          id: 0,
          name: "Contato do vCard",
          number: "Número não disponível"
        }]);
      }
    } else {
      bodyResult = JSON.stringify([{
        id: 0,
        name: "Contato do vCard",
        number: "Número não disponível"
      }]);
    }
  } else {
    try {
      const bodyObj = JSON.parse(msg.body);
      if (!Array.isArray(bodyObj)) {
        console.warn("multi_vcard body is not an array, converting to array");
        bodyResult = JSON.stringify([bodyObj]);
      }
    } catch (error) {
      console.error("Error parsing existing multi_vcard body:", error);
      bodyResult = JSON.stringify([{
        id: 0,
        name: "Contato do vCard",
        number: "Número não disponível"
      }]);
    }
  }
  return bodyResult;
};

export const processVCard = async (
  msg: WbotMessage,
  whatsappId: number
): Promise<WbotMessage> => {
  try {
    const vCardContent = msg.body;
    const extractedData: {
      name: string;
      numbers: string[];
    } = {
      name: "",
      numbers: []
    };
        
    const nameMatch = vCardContent.match(/FN[^:]*:(.*?)(?:\r?\n|$)/i);
    if (nameMatch && nameMatch[1]) {
      extractedData.name = nameMatch[1].trim();
    }
        
    const telRegex = /TEL[^:]*:(.*?)(?:\r?\n|$)/gi;
    let telMatch;
    while ((telMatch = telRegex.exec(vCardContent)) !== null) {
      if (telMatch[1] && telMatch[1].trim()) {
        extractedData.numbers.push(telMatch[1].trim());
      }
    }
        
    const waidRegex = /TEL;waid=(\d+)/gi;
    let waidMatch;
    let hasWaidNumbers = false;
        
    while ((waidMatch = waidRegex.exec(vCardContent)) !== null) {
      if (waidMatch[1] && waidMatch[1].trim()) {
        extractedData.numbers.push("waid=" + waidMatch[1].trim());
        hasWaidNumbers = true;
      }
    }
        
    if (!hasWaidNumbers) {
      const telRegex = /TEL[^:]*:(.*?)(?:\r?\n|$)/gi;
      let telMatch;
      while ((telMatch = telRegex.exec(vCardContent)) !== null) {
        if (telMatch[1] && telMatch[1].trim()) {
          extractedData.numbers.push(telMatch[1].trim());
        }
      }
          
      if (extractedData.numbers.length === 0) {
        const array = vCardContent.split("\n");
        for (let index = 0; index < array.length; index++) {
          const line = array[index];
          if (line.indexOf("+") !== -1) {
            const parts = line.split(":");
            for (let ind = 0; ind < parts.length; ind++) {
              if (parts[ind].indexOf("+") !== -1) {
                extractedData.numbers.push(parts[ind].trim());
              }
            }
          }
        }
      }
    }
        
    const contactsCreated = [];
    for (const phoneNumber of extractedData.numbers) {
      try {
        const phoneStr = String(phoneNumber);
            
        const waidMatch = phoneStr.match(/waid=(\d+)/);
            
        if (waidMatch && waidMatch[1]) {
          const cleanNumber = waidMatch[1];
              
          if (cleanNumber) {
            const cont = await CreateContactService({
              name: extractedData.name || "Contato",
              number: cleanNumber,
              whatsappId
            });
            contactsCreated.push({
              id: cont.id,
              name: cont.name,
              number: cont.number,
              isWaid: true
            });
          }
        } else if (!hasWaidNumbers) {
          const cleanNumber = phoneStr.replace(/\D/g, "");
              
          if (cleanNumber) {
            const cont = await CreateContactService({
              name: extractedData.name || "Contato",
              number: cleanNumber,
              whatsappId
            });
            contactsCreated.push({
              id: cont.id,
              name: cont.name,
              number: cont.number
            });
          }
        }
      } catch (err) {
        if (err.message === "ERR_DUPLICATED_CONTACT") {
          const phoneStr = String(phoneNumber);
              
          const waidMatch = phoneStr.match(/waid=(\d+)/);
              
          if (waidMatch && waidMatch[1]) {
            const cleanNumber = waidMatch[1];
                
            const cont = await GetContactService({
              name: extractedData.name || "Contato",
              number: cleanNumber,
              email: ""
            });
            contactsCreated.push({
              id: cont.id,
              name: cont.name,
              number: cont.number,
              isWaid: true
            });
          } else if (!hasWaidNumbers) {
            const cleanNumber = phoneStr.replace(/\D/g, "");
                
            const cont = await GetContactService({
              name: extractedData.name || "Contato",
              number: cleanNumber,
              email: ""
            });
            contactsCreated.push({
              id: cont.id,
              name: cont.name,
              number: cont.number
            });
          }
        } else {
          console.error(`Error processing vCard contact:`, err);
        }
      }
    }
        
    if (contactsCreated.length > 0) {
      msg.body = JSON.stringify({
        name: extractedData.name || "Contato",
        number: contactsCreated[0].number,
        allNumbers: extractedData.numbers
      });
    } else {
      msg.body = JSON.stringify({
        name: extractedData.name || "Contato",
        number: "Número não disponível",
        allNumbers: []
      });
    }
  } catch (error) {
    console.error("Error processing vcard:", error);
  }
  return msg;
};

export const processMultiVCard = async (
  msg: WbotMessage,
  whatsappId: number
): Promise<WbotMessage> => {
  try {
    if (!msg.vCards) {
      console.error("vCards data is undefined");
      msg.body = JSON.stringify([{
        id: 0,
        name: "Contato do vCard",
        number: "Número não disponível"
      }]);
      return msg;
    }

    if ((typeof msg.vCards === 'string' && (msg.vCards as string).trim() === '') ||
      (Array.isArray(msg.vCards) && msg.vCards.length === 0)) {
      console.error("vCards data is empty");
      msg.body = JSON.stringify([{
        id: 0,
        name: "Contato do vCard",
        number: "Número não disponível"
      }]);
      return msg;
    }

    const array = msg.vCards.toString().split("\n");

    let name = "";
    let number = "";
    const obj = [];
    const conts = [];

    for (let index = 0; index < array.length; index++) {
      const v = array[index];

      const values = v.split(":");

      for (let ind = 0; ind < values.length; ind++) {
        if (values[ind] && values[ind].indexOf("+") !== -1) {
          number = values[ind];
        }
        if (values[ind] && values[ind].indexOf("FN") !== -1 && values[ind + 1]) {
          name = values[ind + 1];
        }
        if (name !== "" && number !== "") {
          obj.push({
            name,
            number
          });
          name = "";
          number = "";
        }
      }
    }

    if (obj.length === 0) {
      console.warn("No contacts were extracted from vCard data");

      if (typeof msg.vCards === 'object') {
        console.info("vCards is an object, stringifying:", JSON.stringify(msg.vCards));
      }

      if (msg.vCards && typeof msg.vCards === 'object') {
        try {
          if (Array.isArray(msg.vCards)) {
            for (let i = 0; i < msg.vCards.length; i++) {
              const vcard = msg.vCards[i];

              if (typeof vcard === 'string') {
                const vcardStr = vcard.toString();
                const nameMatch = vcardStr.match(/FN:(.*?)\n/i);
                const telMatch = vcardStr.match(/TEL[^:]*:(.*?)\n/i);

                if (nameMatch || telMatch) {
                  obj.push({
                    name: nameMatch ? nameMatch[1].trim() : 'Sem nome',
                    number: telMatch ? telMatch[1].trim() : ''
                  });
                }
              }
            }
          } else {
            const vcardStr = String(msg.vCards);
            const vcardParts = vcardStr.split("BEGIN:VCARD");

            for (let i = 1; i < vcardParts.length; i++) {
              const part = vcardParts[i];

              const nameMatch = part.match(/FN:(.*?)\n/i);
              const telMatch = part.match(/TEL[^:]*:(.*?)\n/i);

              if (nameMatch || telMatch) {
                obj.push({
                  name: nameMatch ? nameMatch[1].trim() : 'Sem nome',
                  number: telMatch ? telMatch[1].trim() : ''
                });
              }
            }
          }
        } catch (err) {
          console.error("Error processing vCards object:", err);
        }
      }
    }

    // eslint-disable-next-line no-restricted-syntax
    for await (const ob of obj) {
      try {
        const cont = await CreateContactService({
          name: ob.name,
          number: ob.number.replace(/\D/g, ""),
          whatsappId
        });
        conts.push({
          id: cont.id,
          name: cont.name,
          number: cont.number
        });
      } catch (error) {
        if (error.message === "ERR_DUPLICATED_CONTACT") {
          const cont = await GetContactService({
            name: ob.name,
            number: ob.number.replace(/\D/g, ""),
            email: ""
          });
          conts.push({
            id: cont.id,
            name: cont.name,
            number: cont.number
          });
        } else {
          console.error(`Error processing contact ${ob.name}:`, error);
        }
      }
    }

    if (conts.length > 0) {
      const validContacts = conts.map(contact => ({
        id: contact.id || 0,
        name: contact.name || "Contato",
        number: contact.number || "Número não disponível"
      }));

      const jsonData = JSON.stringify(validContacts);

      try {
        JSON.parse(jsonData);
      } catch (e) {
        console.error("JSON validation failed:", e);
      }

      msg.body = jsonData;
    } else {
      console.warn("No contacts were processed from multi_vcard");

      msg.body = JSON.stringify([{
        id: 0,
        name: "Contato do vCard",
        number: "Número não disponível"
      }]);
    }
  } catch (error) {
    console.error("Error processing multi_vcard:", error);
  }
  return msg;
};
