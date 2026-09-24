import React from "react";
import { render } from "@testing-library/react";

import WhatsMarked from "./index";

const hrefsRelativos = (container) =>
  [...container.querySelectorAll("a[href]")]
    .map((a) => a.getAttribute("href"))
    .filter((href) => href && !/^[a-z][a-z0-9+.-]*:/i.test(href));

/**
 * Regresión (v1.20.1): react-whatsmarked 0.9.14 arma el <a> sólo cuando el
 * href queda igual al texto crudo. Con "Www.anydesk.com" (W mayúscula, sin
 * esquema) el token de url matchea igual —la regla es /i— pero como el prefijo
 * no es exactamente "www." en minúsculas deja href = "Www.anydesk.com": un
 * href RELATIVO. El navegador lo resolvía sobre la ruta actual, así que desde
 * /tickets/2011 el click abría /tickets/Www.anydesk.com y el panel intentaba
 * cargar un ticket con ese "id" (404) en lugar de abrir la web.
 */
describe("WhatsMarked", () => {
  it("completa el esquema de un link 'Www.' y no toca el texto visible", () => {
    const { container } = render(<WhatsMarked>{"Www.anydesk.com"}</WhatsMarked>);

    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("https://Www.anydesk.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.textContent).toBe("Www.anydesk.com");
    expect(container.textContent.trim()).toBe("Www.anydesk.com");
  });

  it("nunca deja un href relativo cliqueable (el invariante del fix)", () => {
    const casos = [
      "Www.anydesk.com",
      "WWW.anydesk.com",
      "www.anydesk.com",
      "Bajalo de Www.anydesk.com",
      "https://nic.ar",
      "el panel: Www.anydesk.com y www.proit.com.ar/panel"
    ];

    casos.forEach((texto) => {
      const { container, unmount } = render(<WhatsMarked>{texto}</WhatsMarked>);
      expect(hrefsRelativos(container)).toEqual([]);
      unmount();
    });
  });

  it("deja intacto un link que ya trae esquema", () => {
    const { container } = render(<WhatsMarked>{"https://nic.ar"}</WhatsMarked>);
    expect(container.querySelector("a").getAttribute("href")).toBe("https://nic.ar");
  });

  it("no toca el texto cuando no hay links", () => {
    const { container } = render(<WhatsMarked>{"hola, todo bien?"}</WhatsMarked>);
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent.trim()).toBe("hola, todo bien?");
  });
});
