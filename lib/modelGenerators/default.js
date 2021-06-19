const DataTypes = require('sequelize').DataTypes

module.exports = class {
  constructor (resourceConfig, joiSchema) {
    const resourceName = resourceConfig.resource
    switch (resourceConfig.primaryKey) {
      case 'uuid':
        this.id = {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        }
        break
      case 'autoincrement':
        this.id = {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          get: function () {
            // JSON:API required this id to be of type string always
            return (this.getDataValue('id')).toString()
          }
        }
        break
      case 'string':
        this.id = {
          type: DataTypes.STRING,
          primaryKey: true
        }
        break
    }
    this.type = {
      type: DataTypes.VIRTUAL, // We do not actually save this to DB, but API needs this
      set: function (val) {
        this.setDataValue('type', val)
      },
      get: function () {
        return resourceName
      }
    }
    this.meta = {
      type: DataTypes.STRING,
      get: function () {
        const data = this.getDataValue('meta')
        if (!data) return undefined
        return JSON.parse(data)
      },
      set: function (val) {
        return this.setDataValue('meta', JSON.stringify(val))
      }
    }

    for (let attributeName of Object.keys(joiSchema)) {
      const attribute = joiSchema[attributeName]
      if (attributeName === 'id') {
        if (resourceConfig.primaryKey === 'string') {
          for (let test of attribute._tests) {
            if (test.name === 'max' || test.name === 'length') {
              this[attributeName].type = DataTypes.STRING(test.arg)
            }
          }
        }
        continue
      }
      if (attribute._type === 'string') {
        //  if the schema defines a length or max value, set the field
        const lengths = attribute._tests.filter(test => test.name === 'max' || test.name === 'length')
        let length
        if (lengths.length === 1) {
          length = lengths[0].arg
        } else if (lengths.length === 2) {
          length = Math.max(lengths[0].arg, lengths[1].arg)
        }
        this[attributeName] = {
          type: DataTypes.STRING(length),
          allowNull: true
        }
        for (let test of attribute._tests) {
          if (test.name === 'max' || test.name === 'length') {
            this[attributeName].type = DataTypes.STRING(test.arg)
          }
        }
      }
      if (attribute._type === 'date') {
        this[attributeName] = {
          type: DataTypes.DATE,
          allowNull: true
        }
      }
      if (attribute._type === 'number') {
        this[attributeName] = {
          type: DataTypes.NUMERIC,
          allowNull: true
        }
      }
      if (attribute._type === 'boolean') {
        this[attributeName] = {
          type: DataTypes.BOOLEAN,
          allowNull: true
        }
      }
      if (attribute._type === 'array') {
        // Serialize array to ';'-separated string for most SQL dbs.
        this[attributeName] = {
          type: DataTypes.STRING,
          allowNull: true,
          get: function () {
            const data = this.getDataValue(attributeName)
            return data ? data.split(';') : []
          },
          set: function (val) {
            this.setDataValue(attributeName, val.join(';'))
          }
        }
      }
      if (attribute._type === 'object') {
        this[attributeName] = {
          type: DataTypes.STRING,
          allowNull: true,
          get: function () {
            const data = this.getDataValue(attributeName)
            return data ? JSON.parse(data) : {}
          },
          set: function (val) {
            this.setDataValue(attributeName, JSON.stringify(val))
          }
        }
      }
      if (attribute._flags) {
        if (attribute._flags.presence === 'required') {
          this[attributeName].allowNull = false
        }
      }
    }
  }
}
