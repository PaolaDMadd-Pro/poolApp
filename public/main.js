let pollId = new URLSearchParams(window.location.search).get('id');

function addDate() {
  const input = document.getElementById('date');
  const ul = document.getElementById('date-list');
  const li = document.createElement('li');
  li.textContent = input.value;
  li.dataset.datetime = input.value;
  ul.appendChild(li);
  input.value = '';
}

async function submitPoll() {
  const title = document.getElementById('title').value;
  const description = document.getElementById('desc').value;
  const dates = Array.from(document.querySelectorAll('#date-list li')).map(li => li.dataset.datetime);
  const res = await fetch('https://poolapp.onrender.com/api/polls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, dates })
  });
  const { id } = await res.json();
  alert(`Poll created! Share this link:\n\n/poll.html?id=${id}`);
  location.href = `/poll.html?id=${id}`;
}

async function loadPoll() {
  const res = await fetch(`https://poolapp.onrender.com/api/polls/${pollId}`);
  const poll = await res.json();
  document.getElementById('title').textContent = poll.title;
  document.getElementById('desc').textContent = poll.description;

  if (location.pathname.endsWith('poll.html')) {
    const ul = document.getElementById('dates');
    poll.dates.forEach((date, idx) => {
      const li = document.createElement('li');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = date;
      li.appendChild(input);
      li.appendChild(document.createTextNode(` ${new Date(date).toLocaleString()}`));
      ul.appendChild(li);
    });
  }

  if (location.pathname.endsWith('results.html')) {
    const counts = {};
    poll.dates.forEach(d => counts[d] = 0);
    poll.votes.forEach(vote => {
      vote.selectedDates.forEach(d => counts[d]++);
    });

    const resultsDiv = document.getElementById('results');
    Object.entries(counts).forEach(([date, count]) => {
      const p = document.createElement('p');
      p.textContent = `${new Date(date).toLocaleString()}: ${count} votes`;
      resultsDiv.appendChild(p);
    });
    const voteList = document.getElementById('vote-list');
    poll.votes.forEach(vote => {
      const p = document.createElement('p');
      const dates = vote.selectedDates.map(d => new Date(d).toLocaleString()).join(', ');
      p.textContent = `${vote.voter}: ${dates}`;
      voteList.appendChild(p);
    });
  }
}

 async function loadAdmin() {
  if (!location.pathname.endsWith('admin.html')) return;

  const pollsContainer = document.getElementById('polls');
  if (!pollsContainer) return;  // Make sure the container exists

  try {
    const response = await fetch('https://poolapp.onrender.com/api/admin/polls');
    if (!response.ok) {
      pollsContainer.textContent = 'Error loading polls.';
      return;
    }
    const polls = await response.json();

    if (polls.length === 0) {
      pollsContainer.textContent = 'No polls created yet.';
    } else {
      polls.forEach(poll => {
        const div = document.createElement('div');
        div.className = 'poll-card';

        const created = new Date(poll.createdAt).toLocaleString();
        const voteCount = poll.votes.length;

        div.innerHTML = `
          <h2>${poll.title}</h2>
          <p><strong>Created:</strong> ${created}</p>
          <p><strong>Votes:</strong> ${voteCount}</p>
          <a href="/poll.html?id=${poll.id}">Vote Page</a>
          <a href="/results.html?id=${poll.id}">Results</a>
          <a href="/admin-view.html?id=${poll.id}">Detailed Admin View</a>
          <a href="#" class="remove-link" data-id="${poll.id}" style="color:red;float:right;">Remove</a>
        `;

        div.querySelector('.remove-link').addEventListener('click', async (e) => {
          e.preventDefault();
          if (confirm('Are you sure you want to remove this poll?')) {
            await removePoll(poll.id);
          }
        });

        pollsContainer.appendChild(div);
      });
// Remove poll by ID (admin)
async function removePoll(pollId) {
  try {
    const res = await fetch(`https://poolapp.onrender.com/api/polls/${pollId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      // Refresh the admin panel
      loadAdmin();
    } else {
      alert('Failed to remove poll.');
    }
  } catch (err) {
    alert('Error removing poll.');
  }
}
    }
  } catch (error) {
    pollsContainer.textContent = 'Failed to load polls.';
    console.error('Error loading polls:', error);
  }
}
async function loadAdminView() {
  if (!location.pathname.endsWith('admin-view.html')) return;

  const pollId = new URLSearchParams(window.location.search).get('id');
  if (!pollId) {
    alert('No poll ID provided.');
    return;
  }

  const res = await fetch(`https://poolapp.onrender.com/api/polls/${pollId}`);
  if (!res.ok) {
    alert('Failed to load poll data.');
    return;
  }
  const poll = await res.json();

  document.getElementById('title').textContent = poll.title;
  document.getElementById('desc').textContent = poll.description;

  const voteList = document.getElementById('vote-list');
  voteList.innerHTML = ''; // clear existing rows

  if (poll.votes.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = 'No votes yet.';
    tr.appendChild(td);
    voteList.appendChild(tr);
  } else {
    poll.votes.forEach(vote => {
      const tr = document.createElement('tr');

      const voterTd = document.createElement('td');
      voterTd.textContent = vote.voter;
      tr.appendChild(voterTd);

      const datesTd = document.createElement('td');
      const formattedDates = vote.selectedDates.map(d => new Date(d).toLocaleString()).join(', ');
      datesTd.textContent = formattedDates;
      tr.appendChild(datesTd);

      voteList.appendChild(tr);
    });
  }
}

async function submitVote() {
  const voter = document.getElementById('voter').value.trim();
  const nameError = document.getElementById('name-error');
  const dateError = document.getElementById('date-error');
  const selected = Array.from(document.querySelectorAll('#dates input:checked')).map(cb => cb.value);
  let valid = true;
  if (!voter) {
    nameError.style.display = 'inline';
    valid = false;
  } else {
    nameError.style.display = 'none';
  }

  if (selected.length === 0) {
    dateError.style.display = 'inline';
    valid = false;
  } else {
    dateError.style.display = 'none';
  }

  if (!valid) return;
  await fetch(`https://poolapp.onrender.com/api/polls/${pollId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter, selectedDates: selected })
  });
  alert('Vote submitted!');
  location.href = `/results.html?id=${pollId}`;
}

async function checkAdmin() {
  const res = await fetch('https://poolapp.onrender.com/api/admin/session');
  const data = await res.json();
  if (data.loggedIn) {
    document.getElementById('polls').style.display = 'block';
    loadAdmin();  // your existing admin panel loader
  } else {
    document.getElementById('login-form').style.display = 'block';
  }
}

async function submitLogin() {
  const username = document.getElementById('admin-user').value;
  const password = document.getElementById('admin-pass').value;
  const res = await fetch('https://poolapp.onrender.com/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (res.ok) {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('polls').style.display = 'block';
    loadAdmin();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}

// Run check on admin.html
if (location.pathname.endsWith('admin.html')) {
  checkAdmin();
}

if (pollId) {
  loadPoll();
} else if (location.pathname.endsWith('admin-view.html')) {
  loadAdminView();
}
else {
  loadAdmin();
}
