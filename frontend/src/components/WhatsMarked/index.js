import React, { useEffect, useRef } from "react";
import WhatsMarkedRaw from "react-whatsmarked";

import { urlAbsolutaConEsquema } from "../../utils/links";

/**
 * Renderiza el marcado de WhatsApp y arregla el destino de los links que vienen
 * sin esquema.
 *
 * Por qué existe: react-whatsmarked 0.9.14 arma el <a> sólo cuando el href
 * queda igual al texto crudo. El token de url matchea "Www.anydesk.com" (la
 * regla es /i), pero como el prefijo no es exactamente "www." en minúsculas no
 * agrega el esquema: href = "Www.anydesk.com", un href RELATIVO. El navegador
 * lo resolvía sobre la ruta actual, así que desde /tickets/2011 el click abría
 * /tickets/Www.anydesk.com y el panel intentaba cargar un ticket con ese "id"
 * (404 y toast de error) en vez de abrir la web.
 *
 * El texto visible queda EXACTAMENTE como lo escribió el cliente: sólo se
 * corrige el href ya renderizado, y con https (el criterio actual de una barra
 * de direcciones). Un sitio que sólo responda por http tampoco funcionaba antes,
 * porque el href quedaba relativo.
 *
 * El wrapper usa display:contents para no agregar una caja al layout, que en
 * este panel está lleno de contenedores flex.
 */
const WhatsMarked = ({ children, ...props }) => {
  const contenedorRef = useRef(null);

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor || typeof contenedor.querySelectorAll !== "function") {
      return;
    }

    contenedor.querySelectorAll("a[href]").forEach((anchor) => {
      const absoluta = urlAbsolutaConEsquema(anchor.getAttribute("href"));
      if (!absoluta) {
        return;
      }

      anchor.setAttribute("href", absoluta);
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    });
  }, [children]);

  return (
    <span ref={contenedorRef} style={{ display: "contents" }}>
      <WhatsMarkedRaw {...props}>{children}</WhatsMarkedRaw>
    </span>
  );
};

export default WhatsMarked;
