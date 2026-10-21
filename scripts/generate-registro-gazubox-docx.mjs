/**
 * Guía para el cliente: registro Shopify, AWS y CJ.
 * npm run docs:registro
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ExternalHyperlink,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "docs", "GUIA_REGISTRO_GAZUBOX.docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "E4E4DC" };

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 160 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 } });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, ...opts })],
    spacing: { after: 120 },
  });
}
function step(n, text) {
  return new Paragraph({
    children: [
      new TextRun({ text: `${n}. `, bold: true, size: 22 }),
      new TextRun({ text, size: 22 }),
    ],
    spacing: { after: 100 },
  });
}
function link(url, label) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text: label ?? url, style: "Hyperlink", size: 22 })],
      }),
    ],
  });
}
function cell(text, bold = false) {
  return new TableCell({
    borders: { top: border, bottom: border, left: border, right: border },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20 })] })],
  });
}
function table(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h) => cell(h, true)), tableHeader: true }),
      ...rows.map((row) => new TableRow({ children: row.map((c) => cell(c)) })),
    ],
  });
}

const doc = new Document({
  styles: {
    default: { document: { styles: [{ id: "Hyperlink", run: { color: "202C49", underline: {} } }] } },
  },
  sections: [
    {
      children: [
        new Paragraph({
          children: [new TextRun({ text: "GAZU", bold: true, size: 48, font: "Calibri" })],
        }),
        new Paragraph({
          children: [new TextRun({ text: "GazuBox", bold: true, size: 28, color: "171A20" })],
          spacing: { after: 80 },
        }),
        p("Guía de registro para empezar la infraestructura. Octubre 2026."),
        p("Esta guía es para crear las tres cuentas a nombre de la empresa. GazuPay queda por fuera de esta etapa. La tienda pública será Shopify. El panel operativo vivirá en un servidor de AWS y hablará con CJ Dropshipping y con Shopify. La creación de ese servidor la hace el equipo técnico: aquí no hay que crear máquinas."),

        h1("1. Cómo queda el sistema"),
        p("Hay tres cuentas distintas. Cada una se paga y se administra por separado."),
        table(
          ["Pieza", "Para qué sirve", "Quién la crea ahora"],
          [
            ["Shopify", "La tienda que ve el cliente en Colombia: catálogo, carrito y cobro.", "El cliente, con esta guía."],
            ["AWS", "La cuenta donde luego se alojará el panel. Hoy solo hace falta la cuenta y la tarjeta.", "El cliente registra y pone el método de pago. El servidor lo crea el equipo."],
            ["CJ Dropshipping", "El proveedor de los productos, el envío internacional y el despacho.", "El cliente, con esta guía."],
          ],
        ),
        new Paragraph({ spacing: { after: 160 } }),
        p("Cuando las tres cuentas existan, envíen al equipo el correo con el que quedó cada una. La clave de API de CJ se comparte por un canal privado, no por un chat abierto. En Shopify no hace falta entregar la contraseña del dueño: se crea un usuario de personal para el equipo."),

        h1("2. Qué plan conviene"),
        h2("Shopify: el plan Grow"),
        p("En la página de precios de Colombia no existe un plan que se llame exactamente US$59. Los planes publicados son Basic, Grow y Advanced. El que corresponde a esta tienda es Grow."),
        p("Cifras publicadas en la página de Colombia (conviene confirmarlas el día del pago, porque Shopify las muestra en dólares y a veces cambia la oferta de entrada): Basic cerca de US$25 al mes o US$19 al mes si se paga el año; Grow cerca de US$65 al mes o US$49 al mes si se paga el año; Advanced cerca de US$399 al mes. Si la cotización que vieron fue de unos US$59, es el plan intermedio, Grow, no Basic ni Advanced."),
        p("Grow alcanza para 5.000 productos y también para más. Shopify no cobra un extra por la cantidad de productos en este rango. Los compradores de la tienda no consumen cupos de usuario: el límite de Grow es de unas 5 cuentas de personal, que son las personas que administran la tienda, no los clientes."),
        p("En Colombia no está Shopify Payments. El cobro se hace con una pasarela local (por ejemplo Wompi, Bold, ePayco o Mercado Pago). Shopify suma una comisión propia por usar esa pasarela: en Grow es del 1 % y en Basic del 2 %. Por eso Grow sale mejor que Basic en cuanto la tienda vende, aunque la mensualidad sea más alta. Advanced baja esa comisión al 0,6 %, pero la mensualidad sube a unos US$399. No hace falta todavía."),
        p("Al registrarse, Shopify suele ofrecer unos días de prueba y después un precio de entrada bajo durante los primeros meses. Eso no cambia el plan: al terminar la promo se cobra Grow."),

        h2("CJ Dropshipping: contratar Prime"),
        p("CJ no cobra por la cantidad de productos. Free, Plus, Prime y Advanced pueden listar 5.000 fichas o más. Lo que cambia entre planes es la velocidad de la API, no el tamaño del catálogo."),
        p("Para no tener que cambiar de plan a mitad de las pruebas, el plan que conviene es Prime: 4 consultas por segundo. Free permite 1 y Plus permite 2, muy cerca de Free. Advanced sube a 6, el máximo publicado, pero no amplía el cupo del día y el salto frente a Prime es pequeño."),
        p("El cupo diario es igual en todos los planes: 50.000 puntos, según la documentación de CJ. El detalle de un producto cuesta 10 puntos. Además, CJ va soltando esos puntos durante el día (el total del día dividido entre los 1.440 minutos), así que no se pueden gastar de una sola vez. Por eso un plan más caro no permite traer más de 5.000 fichas en el mismo día: Prime evita quedarse cortos en velocidad cuando haya varias consultas juntas, por ejemplo precios, stock y envío al mismo tiempo."),
        table(
          ["Plan CJ", "Precio de referencia", "Consultas por segundo", "Decisión"],
          [
            ["Free", "US$0", "1", "Se queda corto en las pruebas."],
            ["Plus", "Unos US$16 al mes", "2", "Poco margen. Habría que volver a pedir un cambio."],
            ["Prime", "Unos US$20 al mes", "4", "Es el que se contrata ahora."],
            ["Advanced", "Unos US$60 al mes", "6", "Solo si se quiere el máximo. No da más productos ni más puntos al día."],
          ],
        ),
        new Paragraph({ spacing: { after: 160 } }),
        p("Esos precios son de referencia pública y CJ los puede cambiar en la pantalla de planes. La velocidad por nivel está publicada en la documentación de la API. Al registrarse, entren al plan Prime y páguenlo con la tarjeta de la empresa."),
        p("CJ sí cobra el producto y el envío de cada pedido, descontados de un saldo que se carga en la cuenta. Esa recarga no es el plan: se hace cuando ya haya ventas. No hace falta cargarla para registrarse. Si la cuenta pasa 30 días sin ninguna compra en CJ, la API se suspende aunque el plan esté pago. Para las pruebas basta una orden pequeña antes de ese plazo, o reactivar la API desde el mismo menú."),

        h1("3. Registro en Shopify"),
        p("Abran este enlace en el computador, con el correo de la empresa:"),
        link("https://www.shopify.com/co/precios", "https://www.shopify.com/co/precios"),
        step(1, "En la columna Grow, pulsen Comienza gratis o Start for free. No elijan Basic ni Advanced."),
        step(2, "Escriban el correo de la empresa y creen una contraseña. Guárdenla en el administrador de contraseñas de la empresa. Ese correo será el dueño de la tienda."),
        step(3, "Confirmen el correo si Shopify envía un código."),
        step(4, "Nombre de la tienda: GazuBox, o el nombre comercial que ya esté decidido. País: Colombia. Dirección: la de la empresa."),
        step(5, "Shopify hace varias preguntas (qué van a vender, si ya tienen productos). Pueden responder en corto o saltarlas. No hace falta cargar productos ni elegir un tema definitivo."),
        step(6, "Cuando entren al administrador, vayan a Configuración y luego a Plan, o a Facturación. Elijan Grow y agreguen la tarjeta de la empresa."),
        step(7, "Revisen que la moneda de la tienda y el país sigan en Colombia. El dominio myshopify.com sale solo. El dominio propio se conecta después."),
        step(8, "En Configuración, Usuarios, creen un usuario de personal para el equipo técnico, con permiso de aplicaciones y productos. No compartan la contraseña del dueño."),
        p("Con eso Shopify queda listo. La pasarela de pago de Colombia y el diseño de la tienda se conectan en un paso posterior, no en este registro."),

        h1("4. Registro en AWS y método de pago"),
        p("Abran este enlace:"),
        link(
          "https://signin.aws.amazon.com/signup?request_type=builderId",
          "https://signin.aws.amazon.com/signup?request_type=builderId",
        ),
        step(1, "Usen el correo de la empresa. Pueden continuar con correo y contraseña, o con Google si ese correo es de Google Workspace. Eviten una cuenta personal."),
        step(2, "Acepten el acuerdo de cliente de AWS y terminen la verificación del correo y del teléfono."),
        step(3, "Si AWS ofrece Sign up (advanced) o Registro avanzado, elijan esa opción. Es la que deja configurar la cuenta y el método de pago. El registro simple a veces crea solo un identificador y no basta para alojar el panel."),
        step(4, "Completen el nombre legal de la empresa, la dirección en Colombia y el contacto de facturación."),
        step(5, "Cuando ya puedan entrar a la consola, abran Facturación. La ruta es el menú de la cuenta, arriba a la derecha, Billing and Cost Management. También pueden ir directo a Métodos de pago."),
        link(
          "https://console.aws.amazon.com/billing/home#/paymentmethods",
          "https://console.aws.amazon.com/billing/home#/paymentmethods",
        ),
        step(6, "Pulsen Add payment method o Agregar método de pago. Registren la tarjeta de la empresa. AWS puede hacer un cargo pequeño de verificación y devolverlo."),
        step(7, "En la misma sección de facturación, revisen que el correo de facturas sea el de la empresa y que la dirección fiscal esté completa."),
        step(8, "No creen servidores, ni EC2, ni bases de datos. Avisen al equipo cuando la tarjeta quede en estado válido. La máquina la crea el equipo técnico dentro de esta misma cuenta."),
        p("AWS puede mostrar créditos de bienvenida. Esos créditos no reemplazan la tarjeta: sin método de pago la cuenta no sostiene el servidor cuando los créditos se acaben."),

        h1("5. Registro en CJ Dropshipping"),
        p("Abran este enlace:"),
        link("https://www.cjdropshipping.com/register.html", "https://www.cjdropshipping.com/register.html"),
        step(1, "Si aparece una verificación humana, completen el texto y pulsen Submit. No distingue mayúsculas."),
        step(2, "Regístrense con el correo de la empresa y una contraseña propia de CJ. No reutilicen la de Shopify ni la de AWS."),
        step(3, "Confirmen el correo de activación."),
        step(4, "Entren a la cuenta. Completen el perfil de empresa y el país Colombia si lo pide."),
        step(5, "Entren a la página de planes de CJ y contraten Prime. No dejen la cuenta en Free ni elijan Plus. Advanced solo si en esa pantalla Prime no aparece y quieren el máximo de consultas por segundo."),
        step(6, "Dentro de My CJ, entren a Authorization y luego a API. Copien la API key. Envíenla al equipo por un canal privado. Esa clave es la que permite traer productos. No la peguen en un grupo abierto."),
        step(7, "No hace falta cargar saldo en la billetera de CJ para este registro. El saldo se usa después, cuando un pedido de Shopify deba comprarse y enviarse."),
        p("Si la página de planes muestra otros precios, manda lo que diga CJ ese día. La decisión no cambia: Prime."),

        h1("6. Qué debe quedar al terminar"),
        table(
          ["Cuenta", "Listo cuando"],
          [
            ["Shopify", "Tienda creada en Colombia, plan Grow elegido, tarjeta guardada y un usuario de personal para el equipo."],
            ["AWS", "Cuenta de la empresa creada y tarjeta visible en Métodos de pago. Sin servidores creados."],
            ["CJ", "Cuenta con plan Prime activo y API key enviada en privado al equipo."],
          ],
        ),
        new Paragraph({ spacing: { after: 200 } }),
        p("Precios consultados en octubre de 2026 en la página de Shopify Colombia, en la documentación de límites de la API de CJ y en las tablas públicas de planes de CJ. Confirmen el valor en pantalla antes de pagar."),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, buffer);
console.log(outPath);
