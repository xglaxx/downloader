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
         const prev = this.state;
         this.state = "failed";
         throw new Error(`Transição inválida: ${prev} -> ${nextState}`);
      } else {
         this.state = nextState;
      }
   }
}