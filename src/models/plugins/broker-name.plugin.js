/** 
 * TODO: Test this plugin a little bit more and add it to all models. 
 */
module.exports = (schema, options = { brokerName: 'BrokerName' }) => {
    const brokerName = options && options.brokerName ? options.brokerName : null;
    schema.add({ brokerName: { type: String, required: true, default: brokerName } });

    schema.pre(['validate', 'save', 'updateOne'], { document: true, query: false }, function (next) {
        this.brokerName = brokerName;
        next();
    });

    schema.pre(['findOneAndUpdate', 'update', 'updateOne', 'updateMany'], { document: false, query: true }, function (next) {
        this.set({ brokerName });
        next();
    });
};