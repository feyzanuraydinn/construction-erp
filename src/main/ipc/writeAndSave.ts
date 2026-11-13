interface Savable {
  save(): void;
}

let dataWrittenListener: () => void = () => {};

export function setDataWrittenListener(listener: () => void): void {
  dataWrittenListener = listener;
}

export function writeAndSave<Db extends Savable, T>(getDb: () => Db, change: (db: Db) => T): T {
  const db = getDb();
  const result = change(db);
  db.save();
  dataWrittenListener();
  return result;
}
