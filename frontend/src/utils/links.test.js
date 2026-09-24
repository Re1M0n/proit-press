import { urlAbsolutaConEsquema } from "./links";

describe("urlAbsolutaConEsquema", () => {
  it("completa con https los dominios sueltos, en cualquier capitalización", () => {
    expect(urlAbsolutaConEsquema("Www.anydesk.com")).toBe("https://Www.anydesk.com");
    expect(urlAbsolutaConEsquema("WWW.anydesk.com")).toBe("https://WWW.anydesk.com");
    expect(urlAbsolutaConEsquema("nic.ar")).toBe("https://nic.ar");
    expect(urlAbsolutaConEsquema("www.proit.com.ar/panel?x=1")).toBe(
      "https://www.proit.com.ar/panel?x=1"
    );
    expect(urlAbsolutaConEsquema("  Www.anydesk.com  ")).toBe("https://Www.anydesk.com");
  });

  it("no toca lo que ya trae esquema", () => {
    expect(urlAbsolutaConEsquema("http://www.x.com")).toBeNull();
    expect(urlAbsolutaConEsquema("https://nic.ar")).toBeNull();
    expect(urlAbsolutaConEsquema("HTTPS://NIC.AR")).toBeNull();
    expect(urlAbsolutaConEsquema("mailto:alguien@dominio.com")).toBeNull();
    expect(urlAbsolutaConEsquema("tel:+5491162465566")).toBeNull();
  });

  it("no toca rutas internas del panel", () => {
    expect(urlAbsolutaConEsquema("/tickets/2011")).toBeNull();
    expect(urlAbsolutaConEsquema("#ancla")).toBeNull();
  });

  it("no inventa destino para texto que no es un dominio", () => {
    expect(urlAbsolutaConEsquema("TKT-0001/estado")).toBeNull();
    expect(urlAbsolutaConEsquema("C:\\Users\\pc")).toBeNull();
    expect(urlAbsolutaConEsquema("")).toBeNull();
    expect(urlAbsolutaConEsquema("   ")).toBeNull();
    expect(urlAbsolutaConEsquema(null)).toBeNull();
    expect(urlAbsolutaConEsquema(undefined)).toBeNull();
  });
});
