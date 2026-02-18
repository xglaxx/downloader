export default class DataSource {
   async getMetadata() {
      throw new Error('Não implementado');
   }
   async getStream(range) {
      throw new Error('Não implementado');
   }
}