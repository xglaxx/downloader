export default class StateMachine {
   constructor(initialState, transitions) {
      this.state = initialState;
      this.transitions = transitions;
   }
   
   getState() {
      return this.state;
   }
   
   setState(nextState) {
      const allowed = this.transitions[this.state] || [];
      if (!allowed.includes(nextState)) {
         throw new Error(`Transição inválida: ${this.state} -> ${nextState}`);
      }
      this.state = nextState;
   }
}