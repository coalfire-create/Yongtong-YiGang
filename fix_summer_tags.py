import re

with open('client/src/pages/summer.tsx', 'r') as f:
    content = f.read()

# I need to find where the tabs close and add an extra </div>
target = """                    </button>
                  ))}
                </div>
              </div>"""

replacement = """                    </button>
                  ))}
                </div>
              </div>
            </div>"""

content = content.replace(target, replacement)

with open('client/src/pages/summer.tsx', 'w') as f:
    f.write(content)

print("Fixed tags")
