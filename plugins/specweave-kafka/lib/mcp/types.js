var MCPServerType = /* @__PURE__ */ ((MCPServerType2) => {
  MCPServerType2["KANAPULI"] = "kanapuli";
  MCPServerType2["TUANNVM"] = "tuannvm";
  MCPServerType2["JOEL_HANSON"] = "joel-hanson";
  MCPServerType2["CONFLUENT"] = "confluent";
  return MCPServerType2;
})(MCPServerType || {});
var AuthMethod = /* @__PURE__ */ ((AuthMethod2) => {
  AuthMethod2["SASL_PLAINTEXT"] = "SASL_PLAINTEXT";
  AuthMethod2["SASL_SCRAM_SHA_256"] = "SASL/SCRAM-SHA-256";
  AuthMethod2["SASL_SCRAM_SHA_512"] = "SASL/SCRAM-SHA-512";
  AuthMethod2["SASL_SSL"] = "SASL_SSL";
  AuthMethod2["SSL"] = "SSL";
  AuthMethod2["PLAINTEXT"] = "PLAINTEXT";
  AuthMethod2["OAUTH"] = "OAUTH";
  return AuthMethod2;
})(AuthMethod || {});
export {
  AuthMethod,
  MCPServerType
};
