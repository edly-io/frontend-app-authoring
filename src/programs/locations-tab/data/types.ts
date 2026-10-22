/** A physical venue where in-person sessions are held (attendance `LocationSerializer`). */
export interface Location {
  id: string;
  city: number;
  name: string;
  description: string;
  biometric_machine_serial_number: string;
}

/** Writable fields; `city` is sent only on create (the program's city). */
export interface LocationPayload {
  name: string;
  description: string;
  biometric_machine_serial_number: string;
  city?: number;
}

/** The `city` the programs API nests on a program detail. */
export interface ProgramCity {
  id: number;
  name: string;
}
