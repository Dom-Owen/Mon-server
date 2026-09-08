import zlib from "node:zlib";

/**
 * Fabrication d'une archive ZIP, sans dépendance extérieure.
 *
 * Sert au bouton « Télécharger toutes mes données ». C'est la réponse à la première
 * inquiétude d'un utilisateur : « et si le site ferme, je perds mes contrats ? ».
 */

type Entree = { nom: string; donnees: Buffer; crc: number; compresse: Buffer; decalage: number };

const TABLE_CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLE_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function heureDos(d = new Date()): { heure: number; date: number } {
  return {
    heure: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export function creerZip(fichiers: { nom: string; contenu: Buffer | string }[]): Buffer {
  const { heure, date } = heureDos();
  const entrees: Entree[] = [];
  const morceaux: Buffer[] = [];
  let decalage = 0;

  for (const f of fichiers) {
    const donnees = Buffer.isBuffer(f.contenu) ? f.contenu : Buffer.from(f.contenu, "utf-8");
    const compresse = zlib.deflateRawSync(donnees, { level: 6 });
    const crc = crc32(donnees);
    const nomBuf = Buffer.from(f.nom, "utf-8");

    const entete = Buffer.alloc(30);
    entete.writeUInt32LE(0x04034b50, 0);
    entete.writeUInt16LE(20, 4);
    entete.writeUInt16LE(0x0800, 6); // noms de fichiers en UTF-8
    entete.writeUInt16LE(8, 8); // deflate
    entete.writeUInt16LE(heure, 10);
    entete.writeUInt16LE(date, 12);
    entete.writeUInt32LE(crc, 14);
    entete.writeUInt32LE(compresse.length, 18);
    entete.writeUInt32LE(donnees.length, 22);
    entete.writeUInt16LE(nomBuf.length, 26);
    entete.writeUInt16LE(0, 28);

    morceaux.push(entete, nomBuf, compresse);
    entrees.push({ nom: f.nom, donnees, crc, compresse, decalage });
    decalage += entete.length + nomBuf.length + compresse.length;
  }

  const debutCentral = decalage;
  for (const e of entrees) {
    const nomBuf = Buffer.from(e.nom, "utf-8");
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(heure, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(e.crc, 16);
    central.writeUInt32LE(e.compresse.length, 20);
    central.writeUInt32LE(e.donnees.length, 24);
    central.writeUInt16LE(nomBuf.length, 28);
    central.writeUInt32LE(e.decalage, 42);
    morceaux.push(central, nomBuf);
    decalage += central.length + nomBuf.length;
  }

  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(entrees.length, 8);
  fin.writeUInt16LE(entrees.length, 10);
  fin.writeUInt32LE(decalage - debutCentral, 12);
  fin.writeUInt32LE(debutCentral, 16);
  morceaux.push(fin);

  return Buffer.concat(morceaux);
}

/** Tableau CSV, encodé pour qu'Excel l'ouvre correctement avec les accents. */
export function csv(entetes: string[], lignes: (string | number | null)[][]): Buffer {
  const echapper = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texte = [entetes, ...lignes].map((l) => l.map(echapper).join(";")).join("\r\n");
  // Le marqueur d'ordre des octets fait qu'Excel reconnaît l'UTF-8 sans qu'on lui demande.
  return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(texte, "utf-8")]);
}
