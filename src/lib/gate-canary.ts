// SIGNAL-TEST — absichtlich unsicherer Code, wird sofort wieder entfernt.
// Zweck: beweisen, dass die Semgrep-Gates rot werden koennen.
import { exec } from "child_process";

export function canary(userInput: string): void {
  exec("ls " + userInput);
}
