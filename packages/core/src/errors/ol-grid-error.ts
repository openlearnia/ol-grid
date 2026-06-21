export class OlGridError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OlGridError";
  }
}

export function requireGridModule(
  registered: boolean,
  moduleName: string,
  packageName: string,
): void {
  if (registered) return;
  throw new OlGridError(
    `${moduleName} is not registered. Import and register ${moduleName} from '${packageName}'.`,
  );
}
