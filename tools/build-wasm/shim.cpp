#include "../../third_party/hfst-optimized-lookup/hfst-optimized-lookup.h"
#include <string>
#include <vector>
#include <sstream>
#include <cstring>

static TransducerFile* g_generator = nullptr;

static TransducerFile* g_transducer = nullptr;

extern "C" {
// Load a transducer from a path inside Emscripten FS (e.g., "/pack.hfstol").
int loadTransducer(const char* path) {
  try {
    if (g_transducer) { delete g_transducer; g_transducer = nullptr; }
    g_transducer = new TransducerFile(path);
    return 0;
  } catch (...) {
    return -1;
  }
}

int loadGenerator(const char* path) {
  try {
    if (g_generator) { delete g_generator; g_generator = nullptr; }
    g_generator = new TransducerFile(path);
    return 0;
  } catch (...) { return -1; }
}

// Apply analysis (UP). If out==nullptr or out_cap==0, returns required bytes.
int applyUp(const char* input, char* out, int out_cap) {
  if (!g_transducer) {
    std::string err = "ERROR:NO_TRANSDUCER";
    int needed = static_cast<int>(err.size());
    if (out && out_cap > 0) {
      int n = needed < out_cap ? needed : out_cap - 1;
      std::memcpy(out, err.data(), n);
      out[n] = '\0';
    }
    return needed;
  }
  try {
    // Don't add ^ and $ markers - they're Apertium-specific and break UralicNLP/GiellaLT transducers
    std::string in(input);
    std::vector<std::vector<std::string>> results = g_transducer->lookup(in.c_str());

    // Debug: If no results, try to understand why
    if (results.empty()) {
      // Return a debug message instead of empty
      std::string debug = "DEBUG:NO_RESULTS:";
      debug += input;
      int needed = static_cast<int>(debug.size());
      if (out == nullptr || out_cap <= 0) return needed;
      int n = needed < out_cap ? needed : out_cap - 1;
      std::memcpy(out, debug.data(), n);
      out[n] = '\0';
      return n;
    }

    std::ostringstream oss;
    for (size_t i = 0; i < results.size(); ++i) {
      for (size_t j = 0; j < results[i].size(); ++j) {
        if (j) oss << ' ';
        oss << results[i][j];
      }
      if (i + 1 < results.size()) oss << '\n';
    }
    std::string s = oss.str();
    int needed = static_cast<int>(s.size());
    if (out == nullptr || out_cap <= 0) return needed;
    int n = needed < out_cap ? needed : out_cap - 1;
    std::memcpy(out, s.data(), n);
    out[n] = '\0';
    return n;
  } catch (const std::exception& e) {
    std::string err = "ERROR:EXCEPTION:";
    err += e.what();
    int needed = static_cast<int>(err.size());
    if (out && out_cap > 0) {
      int n = needed < out_cap ? needed : out_cap - 1;
      std::memcpy(out, err.data(), n);
      out[n] = '\0';
    }
    return needed;
  } catch (...) {
    std::string err = "ERROR:UNKNOWN_EXCEPTION";
    int needed = static_cast<int>(err.size());
    if (out && out_cap > 0) {
      int n = needed < out_cap ? needed : out_cap - 1;
      std::memcpy(out, err.data(), n);
      out[n] = '\0';
    }
    return needed;
  }
}

// Apply generation (DOWN). Uses generator transducer if loaded; falls back to analysis.
int applyDown(const char* input, char* out, int out_cap) {
  if (g_generator) {
    try {
      // Don't add ^ and $ markers - they're Apertium-specific and break UralicNLP/GiellaLT transducers
      std::string in(input);
      std::vector<std::vector<std::string>> results = g_generator->lookup(in.c_str());
      std::ostringstream oss;
      for (size_t i = 0; i < results.size(); ++i) {
        for (size_t j = 0; j < results[i].size(); ++j) {
          if (j) oss << ' ';
          oss << results[i][j];
        }
        if (i + 1 < results.size()) oss << '\n';
      }
      std::string s = oss.str();
      int needed = static_cast<int>(s.size());
      if (out == nullptr || out_cap <= 0) return needed;
      int n = needed < out_cap ? needed : out_cap - 1;
      std::memcpy(out, s.data(), n);
      out[n] = '\0';
      return n;
    } catch (...) { return -3; }
  }
  return applyUp(input, out, out_cap);
}

void unloadTransducer() {
  if (g_transducer) { delete g_transducer; g_transducer = nullptr; }
  if (g_generator) { delete g_generator; g_generator = nullptr; }
}
}

