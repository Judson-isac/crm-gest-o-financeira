// Copyright (c) 2012-2015, Greg Radiker
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// * Redistributions of source code must retain the above copyright notice,
//   this list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN

var constants = {
    /**
     * Define the AMF version.
     * @property AMF_VERSION
     * @type {Number}
     */
    AMF_VERSION: 3,

    /**
     * Define the AMF client type.
     * @property CLIENT_TYPE
     * @type {Number}
     */
    CLIENT_TYPE: 8, // 8 = Flash

    /**
     * Define an empty string.
     * @property EMPTY_STRING
     * @type {String}
     */
    EMPTY_STRING: "",

    /**
     * If the AVM+ serialized an object with a corresponding class in ActionScript,
     * the name of that class is serialized as a string. The special string
     * serialization of a class name is handled by the "Class Definition" use case.
     *
     * In some cases, it may not be desirable to serialize the class name. In these
     * cases, an anonymous object can be serialized and the class name will be an
     * empty string.
     * @property ANONYMOUS_OBJECT
     * @type {String}
     */
    ANONYMOUS_OBJECT: "",

    /**
     * This is the default class name for a remembered class.
     * @property DEFAULT_CLASS_NAME
     * @type {String}
     */
    DEFAULT_CLASS_NAME: "#",

    /**
     * Define the max value for an integer that can be serialized.
     * @property MAX_INT
     * @type {Number}
     */
    MAX_INT: 0x1FFFFFFF, // 29-bit integer

    /**
     * Define the min value for an integer that can be serialized.
     * @property MIN_INT
     * @type {Number}
     */
    MIN_INT: -0x10000000, // 29-bit integer

    /**
     * Define the Undefined marker.
     * @property UNDEFINED_MARKER
     * @type {Number}
     */
    UNDEFINED_MARKER: 0x00,

    /**
     * Define the Null marker.
     * @property NULL_MARKER
     * @type {Number}
     */
    NULL_MARKER: 0x01,

    /**
     * Define the False marker.
     * @property FALSE_MARKER
     * @type {Number}
     */
    FALSE_MARKER: 0x02,

    /**
     * Define the True marker.
     * @property TRUE_MARKER
     * @type {Number}
     */
    TRUE_MARKER: 0x03,

    /**
     * An integer is serialized with a single byte marker 0x04 and a 29-bit
     * unsigned integer using a variable length encoding. The first bit of
     * the first byte is a flag, so only 7 bits of the number can be stored.
     * @property INTEGER_MARKER
     * @type {Number}
     */
    INTEGER_MARKER: 0x04,

    /**
     * A double is serialized with a single byte marker 0x05 and 8 bytes for
     * the floating point value.
     * @property DOUBLE_MARKER
     * @type {Number}
     */
    DOUBLE_MARKER: 0x05,

    /**
     * A string is serialized with a single byte marker 0x06 and a ...
     * @property STRING_MARKER
     * @type {Number}
     */
    STRING_MARKER: 0x06,

    /**
     * The XML and XMLDocument types are considered legacy and should be avoided.
     * In the case of XMLDocument, it is recommended to use the string
     * representation of the XML and pass it to a parser on the receiving end.
     * @property XML_DOCUMENT_MARKER
     * @type {Number}
     */
    XML_DOCUMENT_MARKER: 0x07,

    /**
     * The date marker is serialized with a single byte marker 0x08 and a ...
     * @property DATE_MARKER
     * @type {Number}
     */
    DATE_MARKER: 0x08,

    /**
     * The array marker is serialized with a single byte marker 0x09 and a ...
     * @property ARRAY_MARKER
     * @type {Number}
     */
    ARRAY_MARKER: 0x09,

    /**
     * The object marker is serialized with a single byte marker 0x0a and a ...
     * @property OBJECT_MARKER
     * @type {Number}
     */
    OBJECT_MARKER: 0x0a,

    /**
     * The XML and XMLDocument types are considered legacy and should be avoided.
     * In the case of XML, it is recommended to use the string representation
     * of the XML and pass it to a parser on the receiving end.
     * @property XML_MARKER
     * @type {Number}
     */
    XML_MARKER: 0x0b,

    /**
     * A ByteArray is serialized with a single byte marker 0x0c and a ...
     * @property BYTE_ARRAY_MARKER
     * @type {Number}
     */
    BYTE_ARRAY_MARKER: 0x0c,

    /**
     * A Vector&lt;int&gt; is serialized with a single byte marker 0x0d and a ...
     * @property VECTOR_INT_MARKER
     * @type {Number}
     */
    VECTOR_INT_MARKER: 0x0d,

    /**
     * A Vector&lt;uint&gt; is serialized with a single byte marker 0x0e and a ...
     * @property VECTOR_UINT_MARKER
     * @type {Number}
     */
    VECTOR_UINT_MARKER: 0x0e,

    /**
     * A Vector&lt;double&gt; is serialized with a single byte marker 0x0f and a ...
     * @property VECTOR_DOUBLE_MARKER
     * @type {Number}
     */
    VECTOR_DOUBLE_MARKER: 0x0f,

    /**
     * A Vector&lt;object&gt; is serialized with a single byte marker 0x10 and a ...
     * @property VECTOR_OBJECT_MARKER
     * @type {Number}
     */
    VECTOR_OBJECT_MARKER: 0x10,

    /**
     * A Dictionary is serialized with a single byte marker 0x11 and a ...
     * @property DICTIONARY_MARKER
     * @type {Number}
     */
    DICTIONARY_MARKER: 0x11,

    /**
     * A reference to a previously serialized string is sent as an integer
     * of value 0.
     * @property REFERENCE_BIT
     * @type {Number}
     */
    REFERENCE_BIT: 0x01
};

var serializer = (function () {

    return {
        /**
         * Write a byte to the stream.
         * @method writeByte
         * @param {Number} byte The byte to write to the stream.
         */
        writeByte: function(byte) {
            this.stream.push(byte & 0xff);
        },

        /**
         * Write a boolean to the stream.
         * @method writeBoolean
         * @param {Boolean} b The boolean to write to the stream.
         */
        writeBoolean: function(b) {
            this.writeByte(b ? constants.TRUE_MARKER : constants.FALSE_MARKER);
        },

        /**
         * Write an integer to the stream.
         * @method writeInt
         * @param {Number} i The integer to write to the stream.
         */
        writeInt: function(i) {
            if(i >= constants.MIN_INT && i <= constants.MAX_INT) {
                // We have to manage the sign of the number as we're dealing with
                // 29-bit integers.
                i = (i & 0x1FFFFFFF) | (i < 0 ? 0x10000000 : 0);
                this.writeByte(constants.INTEGER_MARKER);
                this.writeUInt(i);
            } else {
                // If the integer is not in the 29-bit range, we have to write it
                // as a double.
                this.writeDouble(i);
            }
        },

        /**
         * Write an unsigned integer to the stream.
         * @method writeUInt
         * @param {Number} i The unsigned integer to write to the stream.
         */
        writeUInt: function(i) {
            if(i < 0x80) {
                // If the first bit is a 0, the entire number is encoded in the
                // first byte.
                this.writeByte(i);
            } else if(i < 0x4000) {
                // If the second bit is a 0, the number is encoded in the first
                // two bytes.
                this.writeByte(i >> 7 & 0x7f | 0x80);
                this.writeByte(i & 0x7f);
            } else if(i < 0x200000) {
                // If the third bit is a 0, the number is encoded in the first
                // three bytes.
                this.writeByte(i >> 14 & 0x7f | 0x80);
                this.writeByte(i >> 7 & 0x7f | 0x80);
                this.writeByte(i & 0x7f);
            } else if(i < 0x40000000) {
                // If the fourth bit is a 0, the number is encoded in the first
                // four bytes.
                this.writeByte(i >> 22 & 0x7f | 0x80);
                this.writeByte(i >> 15 & 0x7f | 0x80);
                this.writeByte(i >> 8 & 0x7f | 0x80);
                this.writeByte(i & 0xff);
            } else {
                // We should not be able to get there...
                throw "Integer out of range: " + i;
            }
        },

        /**
         * Write a double to the stream.
         * @method writeDouble
         * @param {Number} d The double to write to the stream.
         */
        writeDouble: function(d) {
            this.writeByte(constants.DOUBLE_MARKER);
            var b = new Buffer(8);
            b.writeDoubleBE(d, 0);
            for(var i = 0; i < b.length; i++)
                this.writeByte(b[i]);
        },

        /**
         * Write an UTF-8 string to the stream.
         * @method writeUTF
         * @param {String} s The string to write to the stream.
         */
        writeUTF: function(s) {
            var b = new Buffer(s, "utf-8");
            this.writeUInt(b.length << 1 | constants.REFERENCE_BIT);
            for(var i = 0; i < b.length; i++)
                this.writeByte(b[i]);
        },

        /**
         * Write a string to the stream.
         * @method writeString
         * @param {String} s The string to write to the stream.
         */
        writeString: function(s) {
            this.writeByte(constants.STRING_MARKER);

            // If the string is empty, we don't have to write anything else.
            if(s === constants.EMPTY_STRING) {
                this.writeUInt(constants.REFERENCE_BIT);
                return;
            }

            // We check if the string has already been sent.
            for(var i = 0; i < this.strings.length; i++) {
                if(this.strings[i] === s) {
                    this.writeUInt(i << 1);
                    return;
                }
            }

            this.strings.push(s);
            this.writeUTF(s);
        },

        /**
         * Write a date to the stream.
         * @method writeDate
         * @param {Number} d The date to write to the stream.
         */
        writeDate: function(d) {
            this.writeByte(constants.DATE_MARKER);

            for(var i = 0; i < this.dates.length; i++) {
                if(this.dates[i] === d) {
                    this.writeUInt(i << 1);
                    return;
                }
            }
            this.dates.push(d);

            this.writeUInt(constants.REFERENCE_BIT);
            this.writeDouble(d);
        },

        /**
         * Write an array to the stream.
         * @method writeArray
         * @param {Array} a The array to write to the stream.
         */
        writeArray: function(a) {
            this.writeByte(constants.ARRAY_MARKER);

            for(var i = 0; i < this.arrays.length; i++) {
                if(this.arrays[i] === a) {
                    this.writeUInt(i << 1);
                    return;
                }
            }
            this.arrays.push(a);

            this.writeUInt(a.length << 1 | constants.REFERENCE_BIT);

            for(var key in a) {
                if(!isNaN(parseInt(key))) {
                    continue;
                }

                // If the key is an empty string, it cannot be serialized.
                if(key === constants.EMPTY_STRING) {
                    continue;
                }

                this.writeString(key);
                this.writeObject(a[key]);
            }
            this.writeString(constants.EMPTY_STRING);

            for(var i = 0; i < a.length; i++) {
                this.writeObject(a[i]);
            }
        },

        /**
         * Write a byte array to the stream.
         * @method writeByteArray
         * @param {Array} b The byte array to write to the stream.
         */
        writeByteArray: function(b) {
            this.writeByte(constants.BYTE_ARRAY_MARKER);

            for(var i = 0; i < this.byteArrays.length; i++) {
                if(this.byteArrays[i] === b) {
                    this.writeUInt(i << 1);
                    return;
                }
            }
            this.byteArrays.push(b);

            this.writeUInt(b.length << 1 | constants.REFERENCE_BIT);
            for(var i = 0; i < b.length; i++) {
                this.writeByte(b[i]);
            }
        },

        /**
         * Write an object to the stream.
         * @method writeObject
         * @param {Object} o The object to write to the stream.
         */
        writeObject: function(o) {
            if(o === undefined || o === null) {
                this.writeNull();
                return;
            }

            if(typeof o === "number") {
                if(o === (o | 0)) {
                    this.writeInt(o);
                } else {
                    this.writeDouble(o);
                }
                return;
            }

            if(typeof o === "string") {
                this.writeString(o);
                return;
            }

            if(typeof o === "boolean") {
                this.writeBoolean(o);
                return;
            }

            if(o instanceof Array) {
                this.writeArray(o);
                return;
            }

            if(o instanceof Buffer) {
                this.writeByteArray(o);
                return;
            }

            if(o instanceof Date) {
                this.writeDate(o.getTime());
                return;
            }

            this.writeByte(constants.OBJECT_MARKER);

            // TODO: If the object is a reference to another object,
            // the serialization is different.
            for(var i = 0; i < this.objects.length; i++) {
                if(this.objects[i] === o) {
                    this.writeUInt(i << 1);
                    return;
                }
            }
            this.objects.push(o);

            if(o._c) {
                this.writeUInt((this.classes[o._c] << 2) | constants.REFERENCE_BIT);
            } else {
                var className = o.constructor.name;
                var found = false;
                for(var j = 0; j < this.classes.length; j++) {
                    if(this.classes[j].name === className) {
                        this.writeUInt((j << 2) | constants.REFERENCE_BIT);
                        found = true;
                        break;
                    }
                }
                if(!found) {
                    this.writeUInt(0x0B); // U29O-traits
                    this.writeString(className);
                    for(var key in o) {
                        this.writeString(key);
                    }
                    this.classes.push({
                        name: className,
                        members: Object.keys(o)
                    });
                }
            }

            for(var key in o) {
                if (key != "_c") {
                    this.writeObject(o[key]);
                }
            }
        },

        /**
         * Write a null to the stream.
         * @method writeNull
         */
        writeNull: function() {
            this.writeByte(constants.NULL_MARKER);
        }
    };
})();

var deserializer = (function () {

    return {
        /**
         * Read a byte from the stream.
         * @method readByte
         * @return {Number} The byte read from the stream.
         */
        readByte: function() {
            return this.stream[this.pos++];
        },

        /**
         * Read a boolean from the stream.
         * @method readBoolean
         * @return {Boolean} The boolean read from the stream.
         */
        readBoolean: function(marker) {
            return marker === constants.TRUE_MARKER;
        },

        /**
         * Read an integer from the stream.
         * @method readInt
         * @return {Number} The integer read from the stream.
         */
        readInt: function() {
            var i = this.readUInt();

            // We have to manage the sign of the number as we're dealing with
            // 29-bit integers.
            return (i > constants.MAX_INT) ? (i - 0x20000000) : i;
        },

        /**
         * Read an unsigned integer from the stream.
         * @method readUInt
         * @return {Number} The unsigned integer read from the stream.
         */
        readUInt: function() {
            var i = 0, b = 0, c = 0;

            // The first byte is a flag, so we read it and we determine how many
            // bytes we have to read.
            b = this.readByte();
            while((b & 0x80) !== 0 && c < 3) {
                i = (i << 7) | (b & 0x7f);
                b = this.readByte();
                c++;
            }

            if(c < 3) {
                // If we have read less than 3 bytes, we have to shift the
                // integer and add the last byte.
                i = (i << 7) | b;
            } else {
                // If we have read 3 bytes, we have to shift the integer and
                // add the last byte.
                i = (i << 8) | b;
            }

            return i;
        },

        /**
         * Read a double from the stream.
         * @method readDouble
         * @return {Number} The double read from the stream.
         */
        readDouble: function() {
            var b = new Buffer(8);
            for(var i = 0; i < 8; i++) {
                b[i] = this.readByte();
            }
            return b.readDoubleBE(0);
        },

        /**
         * Read an UTF-8 string from the stream.
         * @method readUTF
         * @param {Number} length The length of the string to read.
         * @return {String} The string read from the stream.
         */
        readUTF: function(length) {
            var s = "";
            var b = new Buffer(length);
            for(var i = 0; i < length; i++) {
                b[i] = this.readByte();
            }
            s = b.toString("utf-8");
            return s;
        },

        /**
         * Read a string from the stream.
         * @method readString
         * @return {String} The string read from the stream.
         */
        readString: function() {
            var ref = this.readUInt();

            if((ref & constants.REFERENCE_BIT) === 0) {
                // This is a reference to a string that has already been read.
                return this.strings[ref >> 1];
            }

            // We have to read the string from the stream.
            var len = ref >> 1;
            if(len === 0) {
                return constants.EMPTY_STRING;
            }

            var s = this.readUTF(len);
            this.strings.push(s);
            return s;
        },

        /**
         * Read a date from the stream.
         * @method readDate
         * @return {Date} The date read from the stream.
         */
        readDate: function() {
            var ref = this.readUInt();
            if((ref & constants.REFERENCE_BIT) === 0) {
                return this.dates[ref >> 1];
            }
            var d = this.readDouble();
            this.dates.push(d);
            return new Date(d);
        },

        /**
         * Read an array from the stream.
         * @method readArray
         * @return {Array} The array read from the stream.
         */
        readArray: function() {
            var ref = this.readUInt();
            if((ref & constants.REFERENCE_BIT) === 0) {
                return this.arrays[ref >> 1];
            }

            var a = [],
                len = ref >> 1,
                key = this.readString();

            this.arrays.push(a);

            // Reading associative values.
            while(key !== constants.EMPTY_STRING) {
                a[key] = this.readObject();
                key = this.readString();
            }

            // Reading indexed values.
            for(var i = 0; i < len; i++) {
                a.push(this.readObject());
            }

            return a;
        },

        /**
         * Read a byte array from the stream.
         * @method readByteArray
         * @return {Array} The byte array read from the stream.
         */
        readByteArray: function() {
            var ref = this.readUInt();
            if((ref & constants.REFERENCE_BIT) === 0) {
                return this.byteArrays[ref >> 1];
            }
            var len = ref >> 1;
            var bytes = new Buffer(len);
            for(var i = 0; i < len; i++) {
                bytes[i] = this.readByte();
            }
            this.byteArrays.push(bytes);
            return bytes;
        },

        /**
         * Read a vector from the stream.
         * @method readVector
         * @return {Array} The vector read from the stream.
         */
        readVector: function(marker) {
            var ref = this.readUInt();
            if((ref & constants.REFERENCE_BIT) === 0) {
                return this.vectors[ref >> 1];
            }

            var v = [],
                len = ref >> 1,
                fixed = this.readByte();

            this.vectors.push(v);

            // The vector type is given by the marker.
            switch (marker) {
                case constants.VECTOR_INT_MARKER:
                    for(var i = 0; i < len; i++) {
                        v.push(this.readByte()); // TODO: readInt, not byte
                    }
                    break;
                case constants.VECTOR_UINT_MARKER:
                    for(var i = 0; i < len; i++) {
                        v.push(this.readByte()); // TODO: readUInt, not byte
                    }
                    break;
                case constants.VECTOR_DOUBLE_MARKER:
                    for(var i = 0; i < len; i++) {
                        v.push(this.readDouble());
                    }
                    break;
                case constants.VECTOR_OBJECT_MARKER:
                    var type = this.readString();
                    for(var i = 0; i < len; i++) {
                        v.push(this.readObject());
                    }
                    break;
            }

            return v;
        },

        /**
         * Read an object from the stream.
         * @method readObject
         * @return {Object} The object read from the stream.
         */
        readObject: function() {
            var marker = this.readByte();
            switch (marker) {
                case constants.UNDEFINED_MARKER:
                    return undefined;
                case constants.NULL_MARKER:
                    return null;
                case constants.FALSE_MARKER:
                    return this.readBoolean(marker);
                case constants.TRUE_MARKER:
                    return this.readBoolean(marker);
                case constants.INTEGER_MARKER:
                    return this.readInt();
                case constants.DOUBLE_MARKER:
                    return this.readDouble();
                case constants.STRING_MARKER:
                    return this.readString();
                case constants.XML_DOCUMENT_MARKER:
                    // Legacy, not supported.
                    throw "Legacy type not supported: XMLDocument";
                case constants.DATE_MARKER:
                    return this.readDate();
                case constants.ARRAY_MARKER:
                    return this.readArray();
                case constants.OBJECT_MARKER:
                    break; // Handled below
                case constants.XML_MARKER:
                    // Legacy, not supported.
                    throw "Legacy type not supported: XML";
                case constants.BYTE_ARRAY_MARKER:
                    return this.readByteArray();
                case constants.VECTOR_INT_MARKER:
                case constants.VECTOR_UINT_MARKER:
                case constants.VECTOR_DOUBLE_MARKER:
                case constants.VECTOR_OBJECT_MARKER:
                    return this.readVector(marker);
                case constants.DICTIONARY_MARKER:
                    // Not yet supported.
                    throw "Type not supported yet: Dictionary";
                default:
                    throw "Unknown marker: " + marker;
            }

            var ref = this.readUInt();

            if((ref & constants.REFERENCE_BIT) === 0) {
                return this.objects[ref >> 1];
            }

            var o = {
                _c: null
            };

            var ti = ref >> 1; // Traits info.
            if ((ti & constants.REFERENCE_BIT) === 0) {
                o._c = this.classes[ti >> 1] || constants.DEFAULT_CLASS_NAME;
            } else {
                o._c = {
                    name: this.readString(),
                    externalizable: (ti & 0x02) !== 0,
                    dynamic: (ti & 0x04) !== 0,
                    members: []
                };
                var len = ti >> 3; // Number of members.
                for (var i = 0; i < len; i++) {
                    o._c.members.push(this.readString());
                }
                this.classes.push(o._c);
            }

            this.objects.push(o);

            if(o._c.externalizable) {
                o.data = this.readObject();
            } else {
                var memberCount = 0;
                if(typeof o._c == "object")
                    memberCount = o._c.members.length;

                for (var i = 0; i < memberCount; i++) {
                    o[o._c.members[i]] = this.readObject();
                }

                if (typeof o._c != "object" || o._c.dynamic) {
                    var key = this.readString();
                    while (key !== constants.EMPTY_STRING) {
                        o[key] = this.readObject();
                        key = this.readString();
                    }
                }
            }

            return o;
        }
    };
})();

var amf = {
    /**
     * Serialize a JavaScript object into an AMF stream.
     * @method serialize
     * @param {Object} obj The object to serialize.
     * @return {Array} The AMF stream.
     */
    serialize: function(obj) {
        var s = Object.create(serializer);
        s.stream = [];
        s.strings = [];
        s.objects = [];
        s.traits = [];
        s.classes = [];
        s.writeObject(obj);
        return s.stream;
    },

    /**
     * Deserialize an AMF stream into a JavaScript object.
     * @method deserialize
     * @param {Array} stream The AMF stream to deserialize.
     * @return {Object} The deserialized object.
     */
    deserialize: function(stream) {
        var s = Object.create(deserializer);
        s.stream = stream;
        s.pos = 0;
        s.strings = [];
        s.objects = [];
        s.dates = [];
        s.arrays = [];
        s.vectors = [];
        s.byteArrays = [];
        s.classes = [];
        var res = [], obj;
        while(s.pos < s.stream.length) {
            obj = s.readObject();
            res.push(obj);
        }
        return res;
    }
};

export default amf;
