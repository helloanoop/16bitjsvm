const createMemory = require("./create-memory");
const instructions = require("./instructions");

class CPU {
  constructor(memory) {
    this.memory = memory;

    this.registerNames = [
      'ip', 'acc',
      'r1', 'r2', 'r3', 'r4',
      'r5', 'r6', 'r7', 'r8',
      'sp', 'fp'
    ];

    this.registers = createMemory(this.registerNames.length * 2);

    this.registerMap = this.registerNames.reduce((map, name, i) => {
      map[name] = i * 2;

      return map;  
    }, {});

    this.setRegister('sp', memory.byteLength -1 -1);
    this.setRegister('fp', memory.byteLength -1 -1);
  }

  debug() {
    this.registerNames.forEach(name => {
      console.log(`${name}: 0x${this.getRegister(name).toString(16).padStart(4, '0')}`);
    });
    console.log();
  }

  viewMemoryAt(address) {
    // 0x0f01: 0x01 0x02 0x03 0x04 0x05 0x06 0x07 0x08
    const nextEightBytes = Array.from({length: 8}, (_, i) =>
      this.memory.getUint8(address + i)
    ).map(v => `0x${v.toString(16).padStart(2, '0')}`)
    
    console.log(`0x${address.toString(16).padStart(4, '0')}: ${nextEightBytes.join(' ')}`);
  }

  getRegister(name) {
    if(!(name in this.registerMap)) {
      throw new Error(`getRegister: No such register '${name}'`);
    }

    return this.registers.getUint16(this.registerMap[name]);
  }

  setRegister(name, value) {
    if(!(name in this.registerMap )) {
      throw new Error(`setRegister: No such register '${name}'`);
    }

    return this.registers.setUint16(this.registerMap[name], value);
  }

  fetch8() {
    const nextInstructionAddress = this.getRegister('ip');
    const instruction = this.memory.getUint8(nextInstructionAddress);
    this.setRegister('ip', nextInstructionAddress + 1);
    return instruction
  }

  fetch16() {
    const nextInstructionAddress = this.getRegister('ip');
    const instruction = this.memory.getUint16(nextInstructionAddress);
    this.setRegister('ip', nextInstructionAddress + 2);
    return instruction
  }

  execute(instruction) {
    switch(instruction) {
      // Move literal into a register
      case instructions.MOV_LIT_REG: {
        const literal = this.fetch16();
        const regIndex = this.fetch8();
        this.registers.setUint16(regIndex*2, literal);
        return;
      }

      // Move register to register
      case instructions.MOV_REG_REG: {
        const regFromIndex = this.fetch8();
        const regToIndex = this.fetch8();
        const value = this.registers.getUint16(regFromIndex*2);
        this.registers.setUint16(regToIndex*2, value);
        return;
      }

      // Move register to memory
      case instructions.MOV_REG_MEM: {
        const regIndex = this.fetch8();
        const address = this.fetch16();
        const value = this.registers.getUint16(regIndex*2);
        this.memory.setUint16(address, value);
        return;
      }

      // Move memory to register
      case instructions.MOV_MEM_REG: {
        const address = this.fetch16();
        const regIndex = this.fetch8();
        const value = this.memory.getUint16(address);
        this.registers.setUint16(regIndex*2, value);
        return;
      }

      // Add register to register
      case instructions.ADD_REG_REG: {
        const rAIndex = this.fetch8();
        const rBIndex = this.fetch8();
        const registerValueA = this.registers.getUint16(rAIndex * 2);
        const registerValueB = this.registers.getUint16(rBIndex * 2);
        this.setRegister('acc', registerValueA + registerValueB);
        return;
      }

      // Jump if not equal
      case instructions.JMP_NOT_EQ: {
        const value = this.fetch16();
        const address = this.fetch16();

        if(value !== this.getRegister('acc')) {
          this.setRegister('ip', address);
        }

        return;
      }

      // Push Literal
      case instructions.PSH_LIT: {
        const spAddress = this.getRegister('sp');
        const value = this.fetch16();

        this.memory.setUint16(spAddress, value);
        this.setRegister('sp', spAddress - 2);

        return;
      }

      // Push Register
      case instructions.PSH_REG: {
        const spAddress = this.getRegister('sp');
        const regIndex = this.fetch8();
        const value = this.registers.getUint16(regIndex*2);

        this.memory.setUint16(spAddress, value);
        this.setRegister('sp', spAddress - 2);

        return;
      }

      // Pop
      case instructions.POP: {
        const spAddress = this.getRegister('sp');
        const nextSpAddress = spAddress + 2;
        const value = this.memory.getUint16(nextSpAddress);
        const regIndex = this.fetch8();

        this.registers.setUint16(regIndex*2, value);
        this.setRegister('sp', nextSpAddress);

        return;
      }
    }
  }

  step() {
    const instruction = this.fetch8();
    return this.execute(instruction);
  }
}

module.exports = CPU;      
